use serde::Serialize;
use std::{
    collections::HashMap,
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex,
    },
};
use tauri::{AppHandle, Emitter, Manager, State, WebviewWindow, WindowEvent};
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenedDocument {
    document_id: String,
    name: String,
    source: String,
}

#[derive(Default)]
struct DocumentStore {
    paths: Mutex<HashMap<String, PathBuf>>,
    next_id: AtomicU64,
}

impl DocumentStore {
    fn open_path(&self, path: PathBuf) -> Result<OpenedDocument, String> {
        validate_gic_path(&path)?;
        let source = fs::read_to_string(&path).map_err(|error| error.to_string())?;
        Ok(self.remember(path, source))
    }

    fn save_path(&self, path: PathBuf, source: &str) -> Result<OpenedDocument, String> {
        let path = with_gic_extension(path);
        validate_gic_path(&path)?;
        fs::write(&path, source).map_err(|error| error.to_string())?;
        Ok(self.remember(path, source.to_owned()))
    }

    fn save(&self, document_id: &str, source: &str) -> Result<(), String> {
        let paths = self.paths.lock().map_err(|error| error.to_string())?;
        let path = paths
            .get(document_id)
            .ok_or_else(|| "Unknown document ID.".to_owned())?;
        fs::write(path, source).map_err(|error| error.to_string())
    }

    fn remember(&self, path: PathBuf, source: String) -> OpenedDocument {
        let document_id = format!("document-{}", self.next_id.fetch_add(1, Ordering::Relaxed));
        let name = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("sketch.gic")
            .to_owned();
        self.paths
            .lock()
            .expect("document store mutex poisoned")
            .insert(document_id.clone(), path);
        OpenedDocument {
            document_id,
            name,
            source,
        }
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

#[tauri::command]
fn open_gic(
    app: AppHandle,
    store: State<'_, DocumentStore>,
) -> Result<Option<OpenedDocument>, String> {
    let selected = app
        .dialog()
        .file()
        .add_filter("GIC sketch", &["gic"])
        .blocking_pick_file();
    selected
        .map(|path| {
            path.into_path()
                .map_err(|error| error.to_string())
                .and_then(|path| store.open_path(path))
        })
        .transpose()
}

#[tauri::command]
fn save_gic(
    document_id: &str,
    source: &str,
    store: State<'_, DocumentStore>,
) -> Result<(), String> {
    store.save(document_id, source)
}

#[tauri::command]
fn save_gic_as(
    app: AppHandle,
    source: &str,
    store: State<'_, DocumentStore>,
) -> Result<Option<OpenedDocument>, String> {
    let selected = app
        .dialog()
        .file()
        .add_filter("GIC sketch", &["gic"])
        .set_file_name("sketch.gic")
        .blocking_save_file();
    selected
        .map(|path| {
            path.into_path()
                .map_err(|error| error.to_string())
                .and_then(|path| store.save_path(path, source))
        })
        .transpose()
}

#[tauri::command]
fn probe_ready(app: AppHandle) -> Result<bool, String> {
    let automated = std::env::var_os("GIC_TAURI_SPIKE_EVIDENCE").is_some();
    record_evidence("webview-ready")?;
    app.emit("shell-probe", ())
        .map_err(|error| error.to_string())?;
    Ok(automated)
}

#[tauri::command]
fn probe_event_received() -> Result<(), String> {
    record_evidence("probe-event-received")
}

#[tauri::command]
fn complete_probe(window: WebviewWindow) -> Result<(), String> {
    window.close().map_err(|error| error.to_string())
}

fn record_evidence(event: &str) -> Result<(), String> {
    let Some(path) = std::env::var_os("GIC_TAURI_SPIKE_EVIDENCE") else {
        return Ok(());
    };
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|error| error.to_string())?;
    let entry = serde_json::json!({ "event": event });
    writeln!(file, "{entry}").map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(DocumentStore::default())
        .setup(|app| {
            record_evidence("rust-setup").map_err(std::io::Error::other)?;
            let window = app
                .get_webview_window("main")
                .ok_or_else(|| std::io::Error::other("main window was not created"))?;
            window.on_window_event(|event| {
                if matches!(event, WindowEvent::CloseRequested { .. }) {
                    let _ = record_evidence("close-requested");
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_gic,
            save_gic,
            save_gic_as,
            probe_ready,
            probe_event_received,
            complete_probe
        ])
        .run(tauri::generate_context!())
        .expect("failed to run the Tauri shell spike");
}

#[cfg(test)]
mod tests {
    use super::DocumentStore;

    #[test]
    fn selected_gic_path_round_trips_without_exposing_it() {
        let temporary_directory =
            std::env::temp_dir().join(format!("gic-tauri-spike-{}", std::process::id()));
        std::fs::create_dir_all(&temporary_directory).expect("create temporary directory");
        let path = temporary_directory.join("round-trip.gic");
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

        std::fs::remove_dir_all(temporary_directory).expect("remove temporary directory");
    }

    #[test]
    fn rejects_unknown_document_id() {
        let store = DocumentStore::default();
        assert_eq!(
            store.save("missing", "circle(1, 2, 3);"),
            Err("Unknown document ID.".to_owned()),
        );
    }
}
