// ABOUTME: Owns native GIC document paths behind opaque webview identifiers.
// ABOUTME: Reads and writes only files selected through desktop document workflows.

use serde::Serialize;
use std::{
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
    pub(crate) name: String,
    pub(crate) source: String,
}

#[derive(Default)]
pub(crate) struct DocumentStore {
    active: Mutex<Option<ActiveDocument>>,
}

struct ActiveDocument {
    document_id: String,
    path: PathBuf,
}

impl DocumentStore {
    pub(crate) fn open_path(&self, path: PathBuf) -> Result<OpenedDocument, String> {
        validate_gic_path(&path)?;
        let source = fs::read_to_string(&path)
            .map_err(|_| "Unable to read the selected sketch.".to_owned())?;
        self.remember(path, source)
    }

    pub(crate) fn save_path(&self, path: PathBuf, source: &str) -> Result<OpenedDocument, String> {
        let path = with_gic_extension(path);
        validate_gic_path(&path)?;
        write_source(&path, source)?;
        self.remember(path, source.to_owned())
    }

    pub(crate) fn save(&self, document_id: &str, source: &str) -> Result<(), String> {
        let active = self
            .active
            .lock()
            .map_err(|_| "Desktop documents are unavailable.".to_owned())?;
        let document = active
            .as_ref()
            .filter(|document| document.document_id == document_id)
            .ok_or_else(|| "Unknown document ID.".to_owned())?;
        write_source(&document.path, source)
    }

    fn remember(&self, path: PathBuf, source: String) -> Result<OpenedDocument, String> {
        let document_id = Uuid::new_v4().to_string();
        let name = path
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| "The selected sketch name is invalid.".to_owned())?
            .to_owned();
        let mut active = self
            .active
            .lock()
            .map_err(|_| "Desktop documents are unavailable.".to_owned())?;
        *active = Some(ActiveDocument {
            document_id: document_id.clone(),
            path,
        });
        Ok(OpenedDocument {
            document_id,
            name,
            source,
        })
    }
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

fn write_source(path: &Path, source: &str) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "The selected sketch path has no parent.".to_owned())?;
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
    use super::DocumentStore;
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

    #[test]
    fn selected_gic_path_round_trips_without_exposing_it() {
        let directory = test_directory("round-trip");
        remove_test_directory(&directory);
        std::fs::create_dir_all(&directory).expect("create test directory");
        let path = directory.join("round-trip.gic");
        std::fs::write(&path, "circle(1, 2, 3);").expect("write fixture");
        let store = DocumentStore::default();

        let opened = store.open_path(path.clone()).expect("open GIC fixture");

        assert_eq!(opened.name, "round-trip.gic");
        assert_eq!(opened.source, "circle(1, 2, 3);");
        assert!(!opened.document_id.contains(path.to_string_lossy().as_ref()));

        store
            .save(&opened.document_id, "circle(4, 5, 6);")
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
            .save_path(selected_path, "background(\"black\");")
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
    fn rejects_unknown_document_identity() {
        let store = DocumentStore::default();

        assert_eq!(
            store.save("missing", "circle(1, 2, 3);"),
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
        let first = store.open_path(first_path).expect("open first fixture");
        let second = store.open_path(second_path).expect("open second fixture");

        assert_ne!(first.document_id, second.document_id);
        assert_eq!(
            store.save(&first.document_id, "background(\"red\");"),
            Err("Unknown document ID.".to_owned()),
        );
        store
            .save(&second.document_id, "background(\"blue\");")
            .expect("save active fixture");
        remove_test_directory(&directory);
    }
}
