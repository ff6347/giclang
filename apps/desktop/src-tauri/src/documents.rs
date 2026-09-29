// ABOUTME: Owns native GIC document paths behind opaque webview identifiers.
// ABOUTME: Reads and writes only files selected through desktop document workflows.

use crate::sketch_bundle::{replace_sketch_files, stage_bytes, validate_thumbnail};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tempfile::NamedTempFile;
use uuid::Uuid;

#[derive(Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OpenedDocument {
    pub(crate) document_id: String,
    pub(crate) sketch_id: String,
    pub(crate) name: String,
    pub(crate) source: String,
    pub(crate) description: Option<String>,
}

#[derive(Default)]
pub(crate) struct DocumentStore {
    active: Mutex<Option<ActiveDocument>>,
    pending: Mutex<BTreeMap<String, PendingDocument>>,
}

struct ActiveDocument {
    document_id: String,
    path: PathBuf,
    owns_description: bool,
}

struct PendingDocument {
    path: PathBuf,
    owns_description: bool,
}

impl DocumentStore {
    pub(crate) fn open_path(
        &self,
        path: PathBuf,
        sketchbook: &Path,
    ) -> Result<OpenedDocument, String> {
        validate_gic_path(&path)?;
        let source = fs::read_to_string(&path)
            .map_err(|_| "Unable to read the selected sketch.".to_owned())?;
        let owns_description = is_sketch_bundle(&path, sketchbook);
        let description = read_description(&path, owns_description)?;
        let name = path
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| "The selected sketch name is invalid.".to_owned())?
            .to_owned();
        let document_id = Uuid::new_v4().to_string();
        let mut pending = self
            .pending
            .lock()
            .map_err(|_| "Desktop documents are unavailable.".to_owned())?;
        pending.insert(
            document_id.clone(),
            PendingDocument {
                path: path.clone(),
                owns_description,
            },
        );
        Ok(OpenedDocument {
            document_id,
            sketch_id: sketch_id_for_path(&path),
            name,
            source,
            description,
        })
    }

    pub(crate) fn accept_open(&self, document_id: &str) -> Result<(), String> {
        let pending = self
            .pending
            .lock()
            .map_err(|_| "Desktop documents are unavailable.".to_owned())?
            .remove(document_id)
            .ok_or_else(|| "Unknown document ID.".to_owned())?;
        let mut active = self
            .active
            .lock()
            .map_err(|_| "Desktop documents are unavailable.".to_owned())?;
        *active = Some(ActiveDocument {
            document_id: document_id.to_owned(),
            path: pending.path,
            owns_description: pending.owns_description,
        });
        Ok(())
    }

    pub(crate) fn cancel_open(&self, document_id: &str) -> Result<(), String> {
        self.pending
            .lock()
            .map_err(|_| "Desktop documents are unavailable.".to_owned())?
            .remove(document_id);
        Ok(())
    }

    #[cfg(test)]
    pub(crate) fn save_path(
        &self,
        path: PathBuf,
        source: &str,
        description: Option<&str>,
        sketchbook: &Path,
    ) -> Result<OpenedDocument, String> {
        let path = with_gic_extension(path);
        validate_gic_path(&path)?;
        let parent = path
            .parent()
            .ok_or_else(|| "The selected sketch path has no parent.".to_owned())?;
        fs::create_dir_all(parent)
            .map_err(|_| "Unable to prepare the sketch folder.".to_owned())?;
        let owns_description = is_sketch_bundle(&path, sketchbook);
        write_bundle(&path, source, description, None, owns_description)?;
        self.remember(
            path,
            source.to_owned(),
            if owns_description {
                description.map(str::to_owned)
            } else {
                None
            },
            owns_description,
        )
    }

    #[cfg(test)]
    pub(crate) fn save_path_pending(
        &self,
        path: PathBuf,
        source: &str,
        description: Option<&str>,
        sketchbook: &Path,
    ) -> Result<OpenedDocument, String> {
        self.save_path_pending_with_thumbnail(path, source, description, None, sketchbook)
    }

    pub(crate) fn save_path_pending_with_thumbnail(
        &self,
        path: PathBuf,
        source: &str,
        description: Option<&str>,
        thumbnail: Option<&[u8]>,
        sketchbook: &Path,
    ) -> Result<OpenedDocument, String> {
        let path = with_gic_extension(path);
        validate_gic_path(&path)?;
        let parent = path
            .parent()
            .ok_or_else(|| "The selected sketch path has no parent.".to_owned())?;
        fs::create_dir_all(parent)
            .map_err(|_| "Unable to prepare the sketch folder.".to_owned())?;
        let owns_description = is_sketch_bundle(&path, sketchbook);
        write_bundle(&path, source, description, thumbnail, owns_description)?;
        self.prepare_pending(
            path,
            source.to_owned(),
            if owns_description {
                description.map(str::to_owned)
            } else {
                None
            },
            owns_description,
        )
    }

    #[cfg(test)]
    pub(crate) fn save(
        &self,
        document_id: &str,
        source: &str,
        description: Option<&str>,
    ) -> Result<(), String> {
        self.save_with_thumbnail(document_id, source, description, None)
    }

    pub(crate) fn save_with_thumbnail(
        &self,
        document_id: &str,
        source: &str,
        description: Option<&str>,
        thumbnail: Option<&[u8]>,
    ) -> Result<(), String> {
        let active = self
            .active
            .lock()
            .map_err(|_| "Desktop documents are unavailable.".to_owned())?;
        let document = active
            .as_ref()
            .filter(|document| document.document_id == document_id)
            .ok_or_else(|| "Unknown document ID.".to_owned())?;
        write_bundle(
            &document.path,
            source,
            description,
            thumbnail,
            document.owns_description,
        )
    }

    pub(crate) fn active_path(&self) -> Option<PathBuf> {
        self.active
            .lock()
            .ok()?
            .as_ref()
            .map(|document| document.path.clone())
    }

    #[cfg(test)]
    fn remember(
        &self,
        path: PathBuf,
        source: String,
        description: Option<String>,
        owns_description: bool,
    ) -> Result<OpenedDocument, String> {
        let opened = self.prepare_pending(path, source, description, owns_description)?;
        self.accept_open(&opened.document_id)?;
        Ok(opened)
    }

    fn prepare_pending(
        &self,
        path: PathBuf,
        source: String,
        description: Option<String>,
        owns_description: bool,
    ) -> Result<OpenedDocument, String> {
        let document_id = Uuid::new_v4().to_string();
        let sketch_id = sketch_id_for_path(&path);
        let name = path
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| "The selected sketch name is invalid.".to_owned())?
            .to_owned();
        self.pending
            .lock()
            .map_err(|_| "Desktop documents are unavailable.".to_owned())?
            .insert(
                document_id.clone(),
                PendingDocument {
                    path,
                    owns_description,
                },
            );
        Ok(OpenedDocument {
            document_id,
            sketch_id,
            name,
            source,
            description,
        })
    }
}

fn sketch_id_for_path(path: &Path) -> String {
    let mut digest = Sha256::new();
    digest.update(path.to_string_lossy().as_bytes());
    format!("{:x}", digest.finalize())
}

fn validate_gic_path(path: &Path) -> Result<(), String> {
    match path.extension().and_then(|extension| extension.to_str()) {
        Some(extension) if extension.eq_ignore_ascii_case("gic") => Ok(()),
        _ => Err("GIC documents must use the .gic extension.".to_owned()),
    }
}

fn with_gic_extension(mut path: PathBuf) -> PathBuf {
    if path.extension().is_none() {
        path.set_extension("gic");
    }
    path
}

pub(crate) fn sketch_path(sketchbook: &Path, chosen: PathBuf) -> PathBuf {
    if chosen.parent() != Some(sketchbook) {
        return chosen;
    }
    let Some(name) = chosen
        .file_stem()
        .and_then(|stem| stem.to_str())
        .map(normalize_sketch_name)
        .filter(|name| !name.is_empty())
    else {
        return chosen;
    };
    sketchbook.join(&name).join(format!("{name}.gic"))
}

fn normalize_sketch_name(name: &str) -> String {
    let trimmed = name.trim();
    let mut normalized = String::with_capacity(trimmed.len());
    let mut previous_was_separator = false;
    for ch in trimmed.chars() {
        if ch.is_whitespace() {
            previous_was_separator = true;
        } else {
            if previous_was_separator {
                normalized.push('_');
            }
            previous_was_separator = false;
            normalized.push(ch.to_ascii_lowercase());
        }
    }
    normalized
}

pub(crate) fn existing_sketch_names(sketchbook: &Path) -> Result<Vec<String>, String> {
    let entries = match fs::read_dir(sketchbook) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(_) => return Err("Unable to read the sketchbook.".to_owned()),
    };
    let mut names = BTreeSet::new();
    for entry in entries {
        let entry = entry.map_err(|_| "Unable to read the sketchbook.".to_owned())?;
        let file_type = entry
            .file_type()
            .map_err(|_| "Unable to read the sketchbook.".to_owned())?;
        let path = entry.path();
        let name = if file_type.is_dir() {
            entry.file_name().into_string().ok()
        } else if file_type.is_file()
            && path
                .extension()
                .and_then(|extension| extension.to_str())
                .is_some_and(|extension| extension.eq_ignore_ascii_case("gic"))
        {
            path.file_stem()
                .and_then(|stem| stem.to_str())
                .map(str::to_owned)
        } else {
            None
        };
        if let Some(name) = name {
            let normalized = normalize_sketch_name(&name);
            if !normalized.is_empty() {
                names.insert(normalized);
            }
        }
    }
    Ok(names.into_iter().collect())
}

fn read_description(path: &Path, owns_description: bool) -> Result<Option<String>, String> {
    let sidecar = path
        .parent()
        .ok_or_else(|| "The selected sketch path has no parent.".to_owned())?
        .join("description.md");
    if !owns_description {
        return Ok(None);
    }
    match fs::symlink_metadata(&sidecar) {
        Ok(metadata) if !metadata.file_type().is_file() => {
            Err("Unable to read the sketch description.".to_owned())
        }
        Ok(_) => fs::read_to_string(sidecar)
            .map(Some)
            .map_err(|_| "Unable to read the sketch description.".to_owned()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(_) => Err("Unable to read the sketch description.".to_owned()),
    }
}

fn is_sketch_bundle(path: &Path, sketchbook: &Path) -> bool {
    let Some(parent) = path.parent() else {
        return false;
    };
    let Some(sketch_name) = parent.file_name().and_then(|name| name.to_str()) else {
        return false;
    };
    let Some(source_name) = path.file_stem().and_then(|name| name.to_str()) else {
        return false;
    };
    let (Ok(sketchbook), Ok(sketch_directory)) = (sketchbook.canonicalize(), parent.canonicalize())
    else {
        return false;
    };
    sketch_directory.parent() == Some(sketchbook.as_path()) && sketch_name == source_name
}

fn write_bundle(
    path: &Path,
    source: &str,
    description: Option<&str>,
    thumbnail: Option<&[u8]>,
    has_sidecar: bool,
) -> Result<(), String> {
    if description.is_some() && !has_sidecar {
        return Err("Descriptions can only be saved inside a sketch folder.".to_owned());
    }
    if !has_sidecar {
        return write_source(path, source);
    }
    if let Some(bytes) = thumbnail {
        validate_thumbnail(bytes)?;
    }
    let parent = path
        .parent()
        .ok_or_else(|| "The selected sketch path has no parent.".to_owned())?;
    fs::create_dir_all(parent).map_err(|_| "Unable to prepare the sketch folder.".to_owned())?;
    let sidecar = parent.join("description.md");
    let thumbnail_path = parent.join("thumbnail.png");
    validate_replaceable(path, "Unable to replace the sketch file.")?;
    validate_replaceable(&sidecar, "Unable to write the sketch description.")?;
    if thumbnail.is_some() {
        validate_replaceable(&thumbnail_path, "Unable to write the sketch thumbnail.")?;
    }
    let source_stage = stage_file(parent, source, "Unable to write the sketch file.")?;
    let description_stage = description
        .map(|contents| stage_file(parent, contents, "Unable to write the sketch description."))
        .transpose()?;
    let thumbnail_stage = thumbnail
        .map(|contents| stage_bytes(parent, contents, "Unable to write the sketch thumbnail."))
        .transpose()?;
    replace_sketch_files(
        path,
        source_stage,
        &sidecar,
        description_stage,
        &thumbnail_path,
        thumbnail_stage,
    )
}

fn validate_replaceable(path: &Path, message: &str) -> Result<(), String> {
    match fs::symlink_metadata(path) {
        Ok(metadata) if !metadata.file_type().is_file() => Err(message.to_owned()),
        Ok(_) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(_) => Err(message.to_owned()),
    }
}

fn stage_file(parent: &Path, contents: &str, message: &str) -> Result<NamedTempFile, String> {
    stage_bytes(parent, contents.as_bytes(), message)
}

#[cfg(test)]
fn move_bundle_backups(
    source_path: &Path,
    description_path: &Path,
) -> Result<Vec<(PathBuf, PathBuf)>, String> {
    let mut backups = Vec::new();
    for target in [source_path, description_path] {
        if target.exists() {
            let parent = target
                .parent()
                .ok_or_else(|| "Invalid sketch path.".to_owned())?;
            let backup = NamedTempFile::new_in(parent)
                .map_err(|_| "Unable to prepare the sketch file.".to_owned())?;
            let backup_path = backup
                .into_temp_path()
                .keep()
                .map_err(|_| "Unable to prepare the sketch file.".to_owned())?;
            fs::remove_file(&backup_path)
                .map_err(|_| "Unable to prepare the sketch file.".to_owned())?;
            backups.push((target.to_path_buf(), backup_path));
        }
    }
    for (index, (target, backup)) in backups.iter().enumerate() {
        if fs::rename(target, backup).is_err() {
            let restore_error = restore_backups(&backups[..index]);
            return Err(restore_error.unwrap_or_else(|| {
                if target == source_path {
                    "Unable to replace the sketch file.".to_owned()
                } else {
                    "Unable to write the sketch description.".to_owned()
                }
            }));
        }
    }
    Ok(backups)
}

#[cfg(test)]
fn install_bundle_stages(
    source_path: &Path,
    description_path: &Path,
    source_stage: NamedTempFile,
    description_stage: Option<NamedTempFile>,
) -> Result<(), String> {
    source_stage
        .persist(source_path)
        .map_err(|_| "Unable to replace the sketch file.".to_owned())
        .and_then(|_| match description_stage {
            Some(stage) => stage
                .persist(description_path)
                .map(|_| ())
                .map_err(|_| "Unable to write the sketch description.".to_owned()),
            None => Ok(()),
        })
}

#[cfg(test)]
fn rollback_bundle_files(
    source_path: &Path,
    description_path: &Path,
    backups: &[(PathBuf, PathBuf)],
    error: String,
) -> String {
    let _ = fs::remove_file(source_path);
    let _ = fs::remove_file(description_path);
    restore_backups(backups).unwrap_or(error)
}

#[cfg(test)]
fn restore_backups(backups: &[(PathBuf, PathBuf)]) -> Option<String> {
    let mut failures = Vec::new();
    for (target, backup) in backups.iter().rev() {
        if let Err(error) = fs::rename(backup, target) {
            failures.push(format!(
                "Could not restore {}: {error}. Original preserved at {}.",
                target.display(),
                backup.display(),
            ));
        }
    }
    (!failures.is_empty()).then(|| {
        format!(
            "Sketch save failed and rollback was incomplete. Recover the original files manually: {}",
            failures.join(" "),
        )
    })
}

fn write_source(path: &Path, source: &str) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "The selected sketch path has no parent.".to_owned())?;
    fs::create_dir_all(parent).map_err(|_| "Unable to prepare the sketch folder.".to_owned())?;
    let mut temporary_file = NamedTempFile::new_in(parent)
        .map_err(|_| "Unable to prepare the sketch file.".to_owned())?;
    temporary_file
        .write_all(source.as_bytes())
        .and_then(|()| temporary_file.as_file().sync_all())
        .map_err(|_| "Unable to write the sketch file.".to_owned())?;
    temporary_file
        .persist(path)
        .map_err(|_| "Unable to replace the sketch file.".to_owned())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{
        existing_sketch_names, install_bundle_stages, move_bundle_backups, rollback_bundle_files,
        sketch_path, stage_file, DocumentStore,
    };
    use std::path::{Path, PathBuf};

    fn test_directory(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "gic-desktop-documents-{}-{name}",
            std::process::id(),
        ))
    }

    fn remove_test_directory(path: &Path) {
        if path.exists() {
            std::fs::remove_dir_all(path).expect("remove test directory");
        }
    }

    fn test_sketchbook(path: &Path) -> PathBuf {
        path.parent()
            .and_then(Path::parent)
            .filter(|parent| parent.file_name().is_some_and(|name| name == "sketches"))
            .map(Path::to_path_buf)
            .unwrap_or_else(|| path.parent().unwrap().join("sketches"))
    }

    fn open_accepted(store: &DocumentStore, path: PathBuf) -> super::OpenedDocument {
        let sketchbook = test_sketchbook(&path);
        let opened = store.open_path(path, &sketchbook).expect("prepare open");
        store.accept_open(&opened.document_id).expect("accept open");
        opened
    }

    #[test]
    fn selected_gic_path_round_trips_without_exposing_it() {
        let directory = test_directory("round-trip");
        remove_test_directory(&directory);
        std::fs::create_dir_all(&directory).expect("create test directory");
        let path = directory.join("round-trip.gic");
        std::fs::write(&path, "circle(1, 2, 3);").expect("write fixture");
        let store = DocumentStore::default();

        let opened = open_accepted(&store, path.clone());

        assert_eq!(opened.name, "round-trip.gic");
        assert_eq!(opened.sketch_id.len(), 64);
        assert_eq!(opened.source, "circle(1, 2, 3);");
        assert_eq!(opened.description, None);
        assert!(!opened.document_id.contains(path.to_string_lossy().as_ref()));

        store
            .save(&opened.document_id, "circle(4, 5, 6);", None)
            .expect("save through opaque ID");
        assert_eq!(
            std::fs::read_to_string(&path).expect("read saved fixture"),
            "circle(4, 5, 6);",
        );
        remove_test_directory(&directory);
    }

    #[test]
    fn save_as_adds_the_gic_extension_and_returns_an_opaque_identity() {
        let directory = test_directory("save-as");
        remove_test_directory(&directory);
        std::fs::create_dir_all(&directory).expect("create test directory");
        let selected_path = directory.join("saved-sketch");
        let store = DocumentStore::default();

        let saved = store
            .save_path(
                selected_path,
                "background(\"black\");",
                None,
                &directory.join("sketches"),
            )
            .expect("save GIC fixture");

        assert_eq!(saved.name, "saved-sketch.gic");
        assert_eq!(saved.source, "background(\"black\");");
        assert_eq!(
            std::fs::read_to_string(directory.join("saved-sketch.gic"))
                .expect("read saved fixture"),
            "background(\"black\");",
        );
        assert!(!saved
            .document_id
            .contains(directory.to_string_lossy().as_ref()));
        remove_test_directory(&directory);
    }

    #[test]
    fn descriptions_round_trip_delete_without_touching_neighbor_files() {
        let directory = test_directory("description-round-trip");
        remove_test_directory(&directory);
        let sketch = directory.join("sketches/orbit");
        let source_path = sketch.join("orbit.gic");
        let description = "---\ntitle: \"Orbit: café\"\norder: 3\nenabled: true\ncategories:\n  - \"circles, lines\"\ntags:\n  - \"a: b\"\n---\n\nMultiline body.\n最後。\n";
        let store = DocumentStore::default();

        let saved = store
            .save_path(
                source_path.clone(),
                "not valid GIC source",
                Some(description),
                &directory.join("sketches"),
            )
            .expect("save broken source and description");
        std::fs::write(sketch.join("thumbnail.png"), [1, 2, 3]).expect("write existing thumbnail");
        std::fs::write(sketch.join("unrelated.txt"), "keep").expect("write unrelated file");
        std::fs::create_dir_all(sketch.join("sessions")).expect("create sessions folder");
        std::fs::write(sketch.join("sessions/one.jsonl"), "session").expect("write session file");

        let reopened = open_accepted(&DocumentStore::default(), source_path.clone());
        assert_eq!(reopened.source, "not valid GIC source");
        assert_eq!(reopened.description.as_deref(), Some(description));
        assert_eq!(
            std::fs::read_to_string(sketch.join("description.md")).expect("read description"),
            description,
        );

        let copy_path = directory.join("sketches/orbit-copy/orbit-copy.gic");
        let copy = DocumentStore::default()
            .save_path(
                copy_path.clone(),
                "copied broken source",
                Some(description),
                &directory.join("sketches"),
            )
            .expect("save copy with description");
        assert_eq!(copy.source, "copied broken source");
        assert_eq!(copy.description.as_deref(), Some(description));
        assert_eq!(
            std::fs::read_to_string(&source_path).unwrap(),
            "not valid GIC source"
        );
        assert_eq!(
            std::fs::read_to_string(sketch.join("description.md")).unwrap(),
            description,
        );

        store
            .save(&saved.document_id, "still broken", None)
            .expect("save after clearing description");

        assert!(!sketch.join("description.md").exists());
        assert_eq!(
            std::fs::read_to_string(source_path).unwrap(),
            "still broken"
        );
        assert_eq!(
            std::fs::read(sketch.join("thumbnail.png")).unwrap(),
            [1, 2, 3]
        );
        assert_eq!(
            std::fs::read_to_string(sketch.join("unrelated.txt")).unwrap(),
            "keep"
        );
        assert_eq!(
            std::fs::read_to_string(sketch.join("sessions/one.jsonl")).unwrap(),
            "session",
        );
        remove_test_directory(&directory);
    }

    #[test]
    fn thumbnail_saves_replace_real_pngs_transactionally_and_save_as_copies_them() {
        let directory = test_directory("thumbnail-save");
        remove_test_directory(&directory);
        let sketchbook = directory.join("sketches");
        let sketch = sketchbook.join("orbit");
        std::fs::create_dir_all(&sketch).expect("create sketch folder");
        let source_path = sketch.join("orbit.gic");
        std::fs::write(&source_path, "previous source").expect("write source");
        let original_png = test_png([255, 0, 0, 255]);
        let replacement_png = test_png([0, 255, 0, 255]);
        std::fs::write(sketch.join("thumbnail.png"), &original_png).expect("write original PNG");
        std::fs::write(sketch.join("unrelated.txt"), "keep").expect("write unrelated file");
        let store = DocumentStore::default();
        let opened = open_accepted(&store, source_path.clone());

        store
            .save_with_thumbnail(
                &opened.document_id,
                "saved source",
                Some("description"),
                Some(&replacement_png),
            )
            .expect("save source, description, and PNG");
        assert_eq!(
            std::fs::read(sketch.join("thumbnail.png")).unwrap(),
            replacement_png
        );
        assert_eq!(
            std::fs::read_to_string(sketch.join("unrelated.txt")).unwrap(),
            "keep"
        );

        let invalid = store.save_with_thumbnail(
            &opened.document_id,
            "must not replace saved data",
            None,
            Some(b"not a PNG"),
        );
        assert!(invalid.is_err());
        assert_eq!(
            std::fs::read_to_string(&source_path).unwrap(),
            "saved source"
        );
        assert_eq!(
            std::fs::read(sketch.join("thumbnail.png")).unwrap(),
            replacement_png
        );

        store
            .save_with_thumbnail(&opened.document_id, "saved without capture", None, None)
            .expect("save without a current preview");
        assert_eq!(
            std::fs::read(sketch.join("thumbnail.png")).unwrap(),
            replacement_png
        );

        let copy_directory = sketchbook.join("orbit-copy");
        let copy = store
            .save_path_pending_with_thumbnail(
                copy_directory.join("orbit-copy.gic"),
                "copy source",
                None,
                Some(&replacement_png),
                &sketchbook,
            )
            .expect("save copy with captured PNG");
        assert_eq!(
            std::fs::read(copy_directory.join("thumbnail.png")).unwrap(),
            replacement_png
        );
        assert_eq!(
            std::fs::read_to_string(source_path).unwrap(),
            "saved without capture"
        );

        let blocked = sketchbook.join("blocked");
        std::fs::create_dir_all(&blocked).expect("create failure fixture");
        std::fs::write(blocked.join("blocked.gic"), "original").expect("write original source");
        std::fs::write(blocked.join("thumbnail.png"), &original_png).expect("write original PNG");
        std::fs::create_dir(blocked.join("description.md")).expect("block description replacement");
        let failed = DocumentStore::default().save_path_pending_with_thumbnail(
            blocked.join("blocked.gic"),
            "must roll back",
            Some("description"),
            Some(&replacement_png),
            &sketchbook,
        );
        assert!(failed.is_err());
        assert_eq!(
            std::fs::read(blocked.join("blocked.gic")).unwrap(),
            b"original"
        );
        assert_eq!(
            std::fs::read(blocked.join("thumbnail.png")).unwrap(),
            original_png
        );
        assert_eq!(copy.source, "copy source");
        remove_test_directory(&directory);
    }

    fn test_png(rgba: [u8; 4]) -> Vec<u8> {
        let mut bytes = Vec::new();
        {
            let mut encoder = png::Encoder::new(&mut bytes, 100, 100);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);
            let mut writer = encoder.write_header().expect("write PNG header");
            let pixels = rgba.repeat(100 * 100);
            writer.write_image_data(&pixels).expect("write PNG pixels");
        }
        bytes
    }

    #[test]
    fn failed_description_write_preserves_the_existing_source_bundle() {
        let directory = test_directory("description-write-failure");
        remove_test_directory(&directory);
        let sketch = directory.join("sketches/orbit");
        std::fs::create_dir_all(&sketch).expect("create sketch folder");
        let source_path = sketch.join("orbit.gic");
        std::fs::write(&source_path, "previous source").expect("write source");
        let store = DocumentStore::default();
        let opened = open_accepted(&store, source_path.clone());
        std::fs::create_dir(sketch.join("description.md")).expect("block description write");

        let result = store.save(
            &opened.document_id,
            "replacement source",
            Some("new description"),
        );

        assert!(result.is_err());
        assert_eq!(
            std::fs::read_to_string(source_path).unwrap(),
            "previous source"
        );
        remove_test_directory(&directory);
    }

    #[test]
    fn failed_description_delete_preserves_existing_source() {
        let directory = test_directory("description-delete-failure");
        remove_test_directory(&directory);
        let sketch = directory.join("sketches/orbit");
        std::fs::create_dir_all(&sketch).expect("create sketch folder");
        let source_path = sketch.join("orbit.gic");
        std::fs::write(&source_path, "previous source").expect("write source");
        let store = DocumentStore::default();
        let opened = open_accepted(&store, source_path.clone());
        std::fs::create_dir(sketch.join("description.md")).expect("block description delete");

        let result = store.save(&opened.document_id, "replacement source", None);

        assert!(result.is_err());
        assert_eq!(
            std::fs::read_to_string(source_path).unwrap(),
            "previous source"
        );
        remove_test_directory(&directory);
    }

    #[test]
    fn failed_save_as_keeps_an_existing_target_bundle_usable() {
        let directory = test_directory("save-as-description-failure");
        remove_test_directory(&directory);
        let sketch = directory.join("sketches/orbit");
        std::fs::create_dir_all(&sketch).expect("create sketch folder");
        let source_path = sketch.join("orbit.gic");
        std::fs::write(&source_path, "previous source").expect("write source");
        std::fs::create_dir(sketch.join("description.md")).expect("block description write");

        let result = DocumentStore::default().save_path(
            source_path.clone(),
            "replacement source",
            Some("new description"),
            &directory.join("sketches"),
        );

        assert!(result.is_err());
        assert_eq!(
            std::fs::read_to_string(source_path).unwrap(),
            "previous source"
        );
        remove_test_directory(&directory);
    }

    #[test]
    fn standalone_sources_do_not_read_or_delete_neighbor_descriptions() {
        let directory = test_directory("standalone-description");
        remove_test_directory(&directory);
        std::fs::create_dir_all(&directory).expect("create test directory");
        let source_path = directory.join("first.gic");
        std::fs::write(&source_path, "source").expect("write source");
        let sidecar = directory.join("description.md");
        std::fs::write(&sidecar, "unrelated description").expect("write sidecar");
        let store = DocumentStore::default();
        let opened = open_accepted(&store, source_path.clone());

        assert_eq!(opened.description, None);
        assert!(store.save(&opened.document_id, "changed", None).is_ok());
        assert_eq!(
            std::fs::read_to_string(&sidecar).unwrap(),
            "unrelated description"
        );
        assert!(store
            .save(&opened.document_id, "changed", Some("description"))
            .is_err());
        let second_path = directory.join("second.gic");
        std::fs::write(&second_path, "second source").expect("write second source");
        let second = open_accepted(&store, second_path);
        assert_eq!(second.description, None);
        store
            .save(&second.document_id, "second changed", None)
            .expect("save second standalone source");
        assert_eq!(
            std::fs::read_to_string(&sidecar).unwrap(),
            "unrelated description"
        );
        remove_test_directory(&directory);
    }

    #[cfg(unix)]
    #[test]
    fn source_only_save_as_preserves_an_unrelated_target_description() {
        let directory = test_directory("unrelated-target-description");
        remove_test_directory(&directory);
        let sketchbook = directory.join("sketches");
        let target_directory = sketchbook.join("existing-folder");
        std::fs::create_dir_all(&target_directory).expect("create target folder");
        let sidecar = target_directory.join("description.md");
        std::fs::write(&sidecar, "unrelated description").expect("write sidecar");
        let source_path = target_directory.join("new.gic");
        let store = DocumentStore::default();

        store
            .save_path(source_path.clone(), "source", None, &sketchbook)
            .expect("save standalone source in existing folder");

        assert_eq!(std::fs::read_to_string(&source_path).unwrap(), "source");
        assert_eq!(
            std::fs::read_to_string(&sidecar).unwrap(),
            "unrelated description"
        );
        assert!(store
            .save_path(
                source_path.clone(),
                "replacement",
                Some("description"),
                &sketchbook
            )
            .is_err());
        assert_eq!(std::fs::read_to_string(&source_path).unwrap(), "source");
        assert_eq!(
            std::fs::read_to_string(&sidecar).unwrap(),
            "unrelated description"
        );
        remove_test_directory(&directory);
    }

    #[test]
    fn reads_sidecars_only_inside_the_approved_sketchbook() {
        let directory = test_directory("unapproved-sketchbook");
        remove_test_directory(&directory);
        let sketchbook = directory.join("configured/sketches");
        let external = directory.join("external/sketches/orbit");
        std::fs::create_dir_all(&external).expect("create external sketch folder");
        let source_path = external.join("orbit.gic");
        std::fs::write(&source_path, "source").expect("write source");
        let sidecar = external.join("description.md");
        std::fs::write(&sidecar, "unrelated description").expect("write sidecar");
        let store = DocumentStore::default();
        let opened = store
            .open_path(source_path.clone(), &sketchbook)
            .expect("open source outside configured sketchbook");

        assert_eq!(opened.description, None);
        store
            .accept_open(&opened.document_id)
            .expect("accept standalone source");
        store
            .save(&opened.document_id, "updated source", None)
            .expect("save standalone source");
        assert!(store
            .save(&opened.document_id, "updated source", Some("description"))
            .is_err());
        assert_eq!(
            std::fs::read_to_string(&sidecar).unwrap(),
            "unrelated description"
        );
        remove_test_directory(&directory);
    }

    #[cfg(unix)]
    #[test]
    fn rejects_description_symlinks_before_reading_outside_the_bundle() {
        use std::os::unix::fs::symlink;

        let directory = test_directory("description-symlink");
        remove_test_directory(&directory);
        let sketch = directory.join("sketches/orbit");
        std::fs::create_dir_all(&sketch).expect("create sketch folder");
        std::fs::write(sketch.join("orbit.gic"), "source").expect("write source");
        let fake_auth = directory.join("fake-auth.json");
        std::fs::write(&fake_auth, r#"{"fixture":"not credentials"}"#)
            .expect("write non-credential fixture");
        symlink(fake_auth, sketch.join("description.md")).expect("create link");

        assert!(DocumentStore::default()
            .open_path(sketch.join("orbit.gic"), &directory.join("sketches"))
            .is_err());
        remove_test_directory(&directory);
    }

    #[test]
    fn failed_install_after_moving_originals_restores_the_real_bundle() {
        let directory = test_directory("post-move-install-failure");
        remove_test_directory(&directory);
        std::fs::create_dir_all(&directory).expect("create test directory");
        let source_path = directory.join("source.gic");
        let description_path = directory.join("description.md");
        std::fs::write(&source_path, "original source").expect("write source");
        std::fs::write(&description_path, "original description").expect("write sidecar");
        let source_stage = stage_file(&directory, "replacement source", "stage source")
            .expect("stage replacement source");
        let description_stage =
            stage_file(&directory, "replacement description", "stage description")
                .expect("stage replacement description");

        let backups = move_bundle_backups(&source_path, &description_path)
            .expect("move original bundle to backups");
        assert!(!source_path.exists());
        assert!(!description_path.exists());
        std::fs::remove_file(source_stage.path()).expect("remove staged source to fail install");
        let error = install_bundle_stages(
            &source_path,
            &description_path,
            source_stage,
            Some(description_stage),
        )
        .expect_err("install must fail after originals have moved");
        let rollback_error =
            rollback_bundle_files(&source_path, &description_path, &backups, error.clone());

        assert_eq!(error, "Unable to replace the sketch file.");
        assert_eq!(rollback_error, error);
        assert_eq!(
            std::fs::read_to_string(source_path).unwrap(),
            "original source"
        );
        assert_eq!(
            std::fs::read_to_string(description_path).unwrap(),
            "original description"
        );
        remove_test_directory(&directory);
    }

    #[test]
    fn failed_rollback_preserves_the_original_at_a_recoverable_path() {
        let directory = test_directory("rollback-preserves-backup");
        remove_test_directory(&directory);
        std::fs::create_dir_all(&directory).expect("create test directory");
        let target = directory.join("source.gic");
        let backup = directory.join("source.backup");
        std::fs::write(&backup, "original source").expect("write backup");
        std::fs::create_dir(&target).expect("block restoration target");

        let error = rollback_bundle_files(
            &target,
            &directory.join("description.md"),
            &[(target.clone(), backup.clone())],
            "Unable to replace the sketch file.".to_owned(),
        );

        assert!(error.contains("rollback was incomplete"));
        assert!(error.contains(backup.to_string_lossy().as_ref()));
        assert_eq!(std::fs::read_to_string(&backup).unwrap(), "original source");
        remove_test_directory(&directory);
    }

    #[test]
    fn rejects_unknown_document_identity() {
        let store = DocumentStore::default();

        assert_eq!(
            store.save("missing", "circle(1, 2, 3);", None),
            Err("Unknown document ID.".to_owned()),
        );
    }

    #[test]
    fn replacing_the_active_document_revokes_its_prior_identity() {
        let directory = test_directory("revoke-replaced");
        remove_test_directory(&directory);
        std::fs::create_dir_all(&directory).expect("create test directory");
        let first_path = directory.join("first.gic");
        let second_path = directory.join("second.gic");
        std::fs::write(&first_path, "circle(1, 2, 3);").expect("write first fixture");
        std::fs::write(&second_path, "circle(4, 5, 6);").expect("write second fixture");
        let store = DocumentStore::default();
        let first = open_accepted(&store, first_path);
        let second = open_accepted(&store, second_path);

        assert_ne!(first.document_id, second.document_id);
        assert_eq!(
            store.save(&first.document_id, "background(\"red\");", None),
            Err("Unknown document ID.".to_owned()),
        );
        store
            .save(&second.document_id, "background(\"blue\");", None)
            .expect("save active fixture");
        remove_test_directory(&directory);
    }

    #[test]
    fn pending_open_keeps_the_active_document_until_accepted() {
        let directory = test_directory("pending-open");
        remove_test_directory(&directory);
        std::fs::create_dir_all(&directory).expect("create test directory");
        let first_path = directory.join("first.gic");
        let second_path = directory.join("second.gic");
        std::fs::write(&first_path, "first").expect("write first fixture");
        std::fs::write(&second_path, "second").expect("write second fixture");
        let store = DocumentStore::default();
        let first = open_accepted(&store, first_path.clone());
        let pending = store
            .open_path(second_path.clone(), &test_sketchbook(&second_path))
            .expect("prepare second open");

        assert_eq!(store.active_path(), Some(first_path.clone()));
        store
            .save(&first.document_id, "still active", None)
            .expect("save active document while replacement is pending");
        store
            .cancel_open(&pending.document_id)
            .expect("cancel pending open");
        assert_eq!(store.active_path(), Some(first_path));
        remove_test_directory(&directory);
    }

    #[test]
    fn malformed_description_candidate_does_not_revoke_the_active_document() {
        let directory = test_directory("malformed-pending-open");
        remove_test_directory(&directory);
        let active_directory = directory.join("sketches/active");
        let candidate_directory = directory.join("sketches/malformed");
        std::fs::create_dir_all(&active_directory).expect("create active folder");
        std::fs::create_dir_all(&candidate_directory).expect("create candidate folder");
        let active_path = active_directory.join("active.gic");
        let candidate_path = candidate_directory.join("malformed.gic");
        std::fs::write(&active_path, "active source").expect("write active source");
        std::fs::write(&candidate_path, "candidate source").expect("write candidate source");
        std::fs::write(
            candidate_directory.join("description.md"),
            "---\ntitle: [invalid\n---\nBody",
        )
        .expect("write malformed description");
        let store = DocumentStore::default();
        let active = open_accepted(&store, active_path.clone());
        let candidate = store
            .open_path(candidate_path.clone(), &test_sketchbook(&candidate_path))
            .expect("prepare candidate");

        assert_eq!(
            candidate.description.as_deref(),
            Some("---\ntitle: [invalid\n---\nBody")
        );
        assert_eq!(store.active_path(), Some(active_path));
        store
            .save(&active.document_id, "active remains writable", None)
            .expect("save active document before accepting candidate");
        store
            .cancel_open(&candidate.document_id)
            .expect("cancel malformed candidate");
        remove_test_directory(&directory);
    }

    #[test]
    fn sketch_path_builds_a_sketch_folder_inside_the_sketchbook() {
        let sketchbook = Path::new("/tmp/gic-sketches");

        assert_eq!(
            sketch_path(sketchbook, sketchbook.join("orbit")),
            PathBuf::from("/tmp/gic-sketches/orbit/orbit.gic"),
        );
        assert_eq!(
            sketch_path(sketchbook, sketchbook.join("orbit.gic")),
            PathBuf::from("/tmp/gic-sketches/orbit/orbit.gic"),
        );
        assert_eq!(
            sketch_path(sketchbook, sketchbook.join("My Cool Sketch")),
            PathBuf::from("/tmp/gic-sketches/my_cool_sketch/my_cool_sketch.gic"),
        );
        assert_eq!(
            sketch_path(sketchbook, sketchbook.join("Orbit.gic")),
            PathBuf::from("/tmp/gic-sketches/orbit/orbit.gic"),
        );
        assert_eq!(
            sketch_path(sketchbook, PathBuf::from("/tmp/elsewhere/orbit.gic")),
            PathBuf::from("/tmp/elsewhere/orbit.gic"),
        );
    }

    #[test]
    fn pending_save_as_preserves_the_active_identity_until_accepted() {
        let directory = test_directory("pending-save-as");
        remove_test_directory(&directory);
        let sketchbook = directory.join("sketches");
        let active_path = directory.join("active.gic");
        std::fs::create_dir_all(&directory).expect("create test directory");
        std::fs::write(&active_path, "active source").expect("write active source");
        let store = DocumentStore::default();
        let active = open_accepted(&store, active_path.clone());

        let saved = store
            .save_path_pending(
                sketchbook.join("copy/copy.gic"),
                "copy source",
                None,
                &sketchbook,
            )
            .expect("prepare copy");

        assert_eq!(store.active_path(), Some(active_path));
        store
            .cancel_open(&saved.document_id)
            .expect("cancel pending save-as activation");
        assert_eq!(store.active_path(), Some(directory.join("active.gic")));
        store
            .save(&active.document_id, "still active", None)
            .expect("save original active document");
        assert_eq!(
            std::fs::read_to_string(directory.join("active.gic")).unwrap(),
            "still active"
        );
        remove_test_directory(&directory);
    }

    #[test]
    fn accepting_pending_save_as_switches_the_active_real_file() {
        let directory = test_directory("accept-pending-save-as");
        remove_test_directory(&directory);
        let sketchbook = directory.join("sketches");
        let active_path = directory.join("active.gic");
        let copy_path = sketchbook.join("copy/copy.gic");
        std::fs::create_dir_all(&directory).expect("create test directory");
        std::fs::write(&active_path, "active source").expect("write active source");
        let store = DocumentStore::default();
        let active = open_accepted(&store, active_path.clone());
        let copy = store
            .save_path_pending(copy_path.clone(), "copy source", None, &sketchbook)
            .expect("prepare copy");

        assert_eq!(store.active_path(), Some(active_path.clone()));
        store
            .accept_open(&copy.document_id)
            .expect("activate saved copy");
        assert_eq!(store.active_path(), Some(copy_path.clone()));
        assert_eq!(
            store.save(&active.document_id, "stale write", None),
            Err("Unknown document ID.".to_owned()),
        );
        store
            .save(&copy.document_id, "edited copy", None)
            .expect("save active copy");
        assert_eq!(
            std::fs::read_to_string(&copy_path).expect("read saved copy"),
            "edited copy"
        );
        assert_eq!(
            std::fs::read_to_string(&active_path).expect("read original"),
            "active source"
        );
        remove_test_directory(&directory);
    }

    #[test]
    fn save_path_creates_the_sketch_folder() {
        let directory = test_directory("sketch-folder");
        remove_test_directory(&directory);
        std::fs::create_dir_all(&directory).expect("create test directory");
        let sketches = directory.join("sketches");
        let store = DocumentStore::default();

        let saved = store
            .save_path(
                sketch_path(&sketches, sketches.join("orbit")),
                "circle(1, 2, 3);",
                None,
                &sketches,
            )
            .expect("save sketch fixture");

        assert_eq!(saved.name, "orbit.gic");
        assert_eq!(
            std::fs::read_to_string(sketches.join("orbit/orbit.gic")).expect("read saved sketch"),
            "circle(1, 2, 3);",
        );
        remove_test_directory(&directory);
    }

    #[test]
    fn existing_sketch_names_reads_normalized_folder_and_gic_names() {
        let directory = test_directory("existing-sketch-names");
        remove_test_directory(&directory);
        let sketchbook = directory.join("sketches");
        std::fs::create_dir_all(sketchbook.join("Sketch_20260924 A"))
            .expect("create existing sketch folder");
        std::fs::create_dir_all(&sketchbook).expect("create sketchbook");
        std::fs::write(sketchbook.join("Sketch_20260924b.gic"), "")
            .expect("create existing GIC file");
        std::fs::write(sketchbook.join(".DS_Store"), "").expect("create Finder metadata");

        let names = existing_sketch_names(&sketchbook).expect("list existing sketches");

        assert_eq!(names, vec!["sketch_20260924_a", "sketch_20260924b"]);
        remove_test_directory(&directory);
    }

    #[test]
    fn existing_sketch_names_returns_empty_for_a_missing_sketchbook() {
        let directory = test_directory("missing-sketchbook");
        remove_test_directory(&directory);

        assert_eq!(existing_sketch_names(&directory), Ok(Vec::new()));

        remove_test_directory(&directory);
    }
}
