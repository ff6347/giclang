// ABOUTME: Discovers safe, current-project sketch bundle candidates for the gallery.
// ABOUTME: Opens catalog entries through opaque IDs revalidated against the active root.

use crate::{
    documents::{canonical_sketchbook, DocumentStore},
    sketch_bundle::validate_thumbnail,
};
use base64::Engine;
use serde::Serialize;
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};
use uuid::Uuid;

const MAX_DESCRIPTION_BYTES: u64 = 1024 * 1024;
const MAX_THUMBNAIL_BYTES: u64 = 1024 * 1024;

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SketchCandidate {
    pub(crate) entry_id: String,
    pub(crate) description: String,
    pub(crate) thumbnail_data_url: Option<String>,
}

#[derive(Default)]
pub(crate) struct GalleryStore {
    entries: Mutex<HashMap<String, PathBuf>>,
}

impl GalleryStore {
    pub(crate) fn discover(&self, sketchbook: &Path) -> Result<Vec<SketchCandidate>, String> {
        self.replace_entries(HashMap::new())?;
        let mut entries = HashMap::new();
        let mut candidates = Vec::new();
        let root = match canonical_sketchbook(sketchbook) {
            Ok(root) => root,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                self.replace_entries(entries)?;
                return Ok(candidates);
            }
            Err(_) => return Err("Unable to read the sketchbook.".to_owned()),
        };
        let children =
            fs::read_dir(&root).map_err(|_| "Unable to read the sketchbook.".to_owned())?;
        for child in children.flatten() {
            let folder = child.path();
            let Ok(kind) = fs::symlink_metadata(&folder) else {
                continue;
            };
            if !kind.file_type().is_dir() {
                continue;
            }
            let Ok(folder) = fs::canonicalize(folder) else {
                continue;
            };
            if folder.parent() != Some(root.as_path()) {
                continue;
            }
            let Some(name) = folder.file_name().and_then(|value| value.to_str()) else {
                continue;
            };
            let source = folder.join(format!("{name}.gic"));
            let description_path = folder.join("description.md");
            if !is_regular_file(&source) || !is_regular_file(&description_path) {
                continue;
            }
            let Ok(description) = read_bounded_text(&description_path, MAX_DESCRIPTION_BYTES)
            else {
                continue;
            };
            let thumbnail_data_url = read_thumbnail(&folder.join("thumbnail.png"));
            let entry_id = Uuid::new_v4().to_string();
            entries.insert(entry_id.clone(), source);
            candidates.push(SketchCandidate {
                entry_id,
                description,
                thumbnail_data_url,
            });
        }
        self.replace_entries(entries)?;
        Ok(candidates)
    }

    pub(crate) fn open(
        &self,
        entry_id: &str,
        sketchbook: &Path,
        documents: &DocumentStore,
    ) -> Result<crate::documents::OpenedDocument, String> {
        let path = self
            .entries
            .lock()
            .map_err(|_| "Sketches are unavailable.".to_owned())?
            .get(entry_id)
            .cloned()
            .ok_or_else(|| "This sketch is no longer available.".to_owned())?;
        let root = canonical_sketchbook(sketchbook)
            .map_err(|_| "This sketch is no longer available.".to_owned())?;
        let folder = path
            .parent()
            .ok_or_else(|| "This sketch is no longer available.".to_owned())?;
        let canonical_folder = folder
            .canonicalize()
            .map_err(|_| "This sketch is no longer available.".to_owned())?;
        if canonical_folder.parent() != Some(root.as_path())
            || !is_regular_file(&path)
            || !is_regular_file(&canonical_folder.join("description.md"))
        {
            return Err("This sketch is no longer available.".to_owned());
        }
        documents.open_path(path, sketchbook)
    }

    fn replace_entries(&self, entries: HashMap<String, PathBuf>) -> Result<(), String> {
        *self
            .entries
            .lock()
            .map_err(|_| "Sketches are unavailable.".to_owned())? = entries;
        Ok(())
    }
}

fn is_regular_file(path: &Path) -> bool {
    fs::symlink_metadata(path).is_ok_and(|metadata| metadata.file_type().is_file())
}

fn read_bounded_text(path: &Path, max_bytes: u64) -> Result<String, String> {
    let metadata = fs::symlink_metadata(path).map_err(|_| "Unable to read a sketch.".to_owned())?;
    if !metadata.file_type().is_file() || metadata.len() > max_bytes {
        return Err("Unable to read a sketch.".to_owned());
    }
    fs::read_to_string(path).map_err(|_| "Unable to read a sketch.".to_owned())
}

fn read_thumbnail(path: &Path) -> Option<String> {
    let metadata = fs::symlink_metadata(path).ok()?;
    if !metadata.file_type().is_file() || metadata.len() > MAX_THUMBNAIL_BYTES {
        return None;
    }
    let bytes = fs::read(path).ok()?;
    if validate_thumbnail(&bytes).is_err() {
        return None;
    }
    Some(format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(bytes)
    ))
}

#[cfg(test)]
mod tests {
    use super::GalleryStore;
    use crate::documents::DocumentStore;
    use std::{
        fs,
        path::{Path, PathBuf},
    };
    use tempfile::TempDir;

    fn bundle(root: &Path, name: &str, description: &str, source: &str) -> PathBuf {
        let folder = root.join("sketches").join(name);
        fs::create_dir_all(&folder).expect("create sketch folder");
        fs::write(folder.join(format!("{name}.gic")), source).expect("write source");
        fs::write(folder.join("description.md"), description).expect("write description");
        folder
    }

    #[test]
    fn discovers_only_direct_current_project_bundles_and_opens_the_saved_files() {
        let project = TempDir::new().expect("create project");
        let other = TempDir::new().expect("create other project");
        let description = "---\ntitle: Orbit\norder: 0\nenabled: true\ncategories: []\ntags: []\n---\n\nA saved sketch.";
        let folder = bundle(project.path(), "orbit", description, "invalid GIC");
        bundle(other.path(), "other", "description", "other source");
        let store = GalleryStore::default();
        let candidates = store
            .discover(&project.path().join("sketches"))
            .expect("discover current project");
        assert_eq!(candidates.len(), 1);
        assert_eq!(candidates[0].description, description);
        let opened = store
            .open(
                &candidates[0].entry_id,
                &project.path().join("sketches"),
                &DocumentStore::default(),
            )
            .expect("open selected sketch");
        assert_eq!(opened.source, "invalid GIC");
        assert_eq!(opened.description.as_deref(), Some(description));
        assert_eq!(
            fs::read_to_string(folder.join("orbit.gic")).unwrap(),
            "invalid GIC"
        );
    }

    #[test]
    fn saved_sketch_discovery_and_reopen_preserve_the_real_png_and_description() {
        use base64::Engine;
        use std::io::Cursor;

        let project = TempDir::new().expect("create project");
        let sketchbook = project.path().join("sketches");
        let source = "this intentionally remains broken GIC";
        let description = "---\ntitle: Orbit\norder: 4\nenabled: true\ncategories: []\ntags: []\n---\n\nSaved from the current document.";
        let bytes = thumbnail_png([12, 34, 56, 255]);
        let documents = DocumentStore::default();
        let saved = documents
            .save_path_pending_with_thumbnail(
                sketchbook.join("orbit/orbit.gic"),
                source,
                Some(description),
                Some(&bytes),
                &sketchbook,
            )
            .expect("save source, description, and real PNG");
        documents
            .accept_open(&saved.document_id)
            .expect("accept saved document");

        let gallery = GalleryStore::default();
        let candidate = gallery
            .discover(&sketchbook)
            .expect("discover saved sketch")
            .pop()
            .expect("include eligible sketch");
        assert_eq!(candidate.description, description);
        let data_url = candidate
            .thumbnail_data_url
            .as_deref()
            .expect("include saved thumbnail");
        let encoded = data_url
            .strip_prefix("data:image/png;base64,")
            .expect("return a PNG data URL");
        let discovered_bytes = base64::engine::general_purpose::STANDARD
            .decode(encoded)
            .expect("decode discovered PNG");
        assert_eq!(discovered_bytes, bytes);

        let mut decoder = png::Decoder::new(Cursor::new(discovered_bytes));
        decoder.set_transformations(png::Transformations::IDENTITY);
        let mut reader = decoder.read_info().expect("read PNG dimensions");
        assert_eq!((reader.info().width, reader.info().height), (100, 100));
        let mut pixels = vec![0; reader.output_buffer_size().expect("PNG buffer size")];
        let frame = reader.next_frame(&mut pixels).expect("decode PNG pixels");
        assert_eq!(
            &pixels[..frame.buffer_size()],
            &[12, 34, 56, 255].repeat(100 * 100)
        );

        let restarted_gallery = GalleryStore::default();
        let restarted_candidate = restarted_gallery
            .discover(&sketchbook)
            .expect("rediscover after store restart")
            .pop()
            .expect("restore saved gallery entry");
        let reopened = restarted_gallery
            .open(
                &restarted_candidate.entry_id,
                &sketchbook,
                &DocumentStore::default(),
            )
            .expect("reopen saved source after store restart");
        assert_eq!(reopened.source, source);
        assert_eq!(reopened.description.as_deref(), Some(description));
        assert_eq!(
            restarted_candidate.thumbnail_data_url.as_deref(),
            Some(data_url)
        );
    }

    fn thumbnail_png(rgba: [u8; 4]) -> Vec<u8> {
        let mut bytes = Vec::new();
        {
            let mut encoder = png::Encoder::new(&mut bytes, 100, 100);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);
            let mut writer = encoder.write_header().expect("write PNG header");
            writer
                .write_image_data(&rgba.repeat(100 * 100))
                .expect("write PNG pixels");
        }
        bytes
    }

    #[test]
    fn malformed_or_unreadable_candidates_are_isolated_and_missing_images_are_optional() {
        let project = TempDir::new().expect("create project");
        let sketchbook = project.path().join("sketches");
        let valid = bundle(project.path(), "valid", "valid description", "valid source");
        let no_description = sketchbook.join("no-description");
        fs::create_dir_all(&no_description).expect("create hidden sketch");
        fs::write(no_description.join("no-description.gic"), "source").unwrap();
        let orphan = sketchbook.join("orphan");
        fs::create_dir_all(&orphan).expect("create orphan sketch");
        fs::write(orphan.join("different-name.gic"), "source").unwrap();
        fs::write(orphan.join("description.md"), "description").unwrap();
        let malformed = bundle(project.path(), "malformed", "broken", "source");
        fs::write(malformed.join("description.md"), [0xff]).unwrap();
        let store = GalleryStore::default();
        let candidates = store.discover(&sketchbook).expect("discover safely");
        assert_eq!(candidates.len(), 1);
        assert_eq!(candidates[0].description, "valid description");
        assert_eq!(candidates[0].thumbnail_data_url, None);
        fs::write(valid.join("thumbnail.png"), b"not a PNG").unwrap();
        let refreshed = store.discover(&sketchbook).expect("refresh candidates");
        assert_eq!(refreshed.len(), 1);
        assert_eq!(refreshed[0].thumbnail_data_url, None);
        assert!(valid.join("valid.gic").exists());
        assert!(malformed.join("malformed.gic").exists());
    }

    #[cfg(unix)]
    #[test]
    fn does_not_read_a_symlinked_description() {
        use std::os::unix::fs::symlink;
        let project = TempDir::new().expect("create project");
        let other = TempDir::new().expect("create other project");
        let folder = bundle(
            project.path(),
            "linked-description",
            "description",
            "source",
        );
        let outside = other.path().join("description.md");
        fs::write(&outside, "private metadata").unwrap();
        fs::remove_file(folder.join("description.md")).unwrap();
        symlink(outside, folder.join("description.md")).expect("link description");
        assert!(GalleryStore::default()
            .discover(&project.path().join("sketches"))
            .unwrap()
            .is_empty());
    }

    #[cfg(unix)]
    #[test]
    fn rejects_a_symlinked_sketchbook_and_stale_ids_when_both_roots_exist() {
        use std::os::unix::fs::symlink;
        let project = TempDir::new().expect("create project");
        let other = TempDir::new().expect("create other project");
        let folder = bundle(project.path(), "linked", "description", "source");
        let outside = other.path().join("outside.gic");
        fs::write(&outside, "secret").unwrap();
        fs::remove_file(folder.join("linked.gic")).unwrap();
        symlink(&outside, folder.join("linked.gic")).expect("link source");
        let store = GalleryStore::default();
        assert!(store
            .discover(&project.path().join("sketches"))
            .unwrap()
            .is_empty());

        fs::remove_file(folder.join("linked.gic")).unwrap();
        fs::write(folder.join("linked.gic"), "project A source").unwrap();
        let candidate = store
            .discover(&project.path().join("sketches"))
            .unwrap()
            .remove(0);

        let actual_other_folder = bundle(
            other.path(),
            "linked",
            "other description",
            "project B source",
        );
        let other_sketchbook = other.path().join("sketches");
        assert!(store
            .open(
                &candidate.entry_id,
                &other_sketchbook,
                &DocumentStore::default(),
            )
            .is_err());
        assert_eq!(
            fs::read_to_string(actual_other_folder.join("linked.gic")).unwrap(),
            "project B source"
        );

        let alias = other.path().join("aliased-project");
        fs::create_dir(&alias).unwrap();
        symlink(project.path().join("sketches"), alias.join("sketches"))
            .expect("link project B sketchbook to project A");
        assert!(store
            .open(
                &candidate.entry_id,
                &alias.join("sketches"),
                &DocumentStore::default(),
            )
            .is_err());
        assert!(store.discover(&alias.join("sketches")).is_err());
        assert_eq!(fs::read_to_string(outside).unwrap(), "secret");
    }
}
