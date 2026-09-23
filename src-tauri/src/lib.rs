// ABOUTME: Implements the narrow native boundary for the GIC desktop application.
// ABOUTME: Persists approved non-secret settings without exposing filesystem paths.

mod desktop_menu;
mod documents;
mod external_tools;
mod managed_files;
mod workspace;

use documents::{sketch_path, DocumentStore, OpenedDocument};
use external_tools::AssistantStatus;
use std::{collections::BTreeMap, fs, io::Write, path::PathBuf, sync::Mutex};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tempfile::NamedTempFile;
use workspace::{Resolution, WorkspaceManager, WorkspaceStatus};

const ALLOWED_SETTING_KEYS: [&str; 7] = [
    "gic.appearance",
    "gic.canvasFrame",
    "gic.darkTheme",
    "gic.formatOnSave",
    "gic.lightTheme",
    "gic.projectsDirectory",
    "gic.workspaceLayout",
];

const DEFAULT_WORKSPACE_DIR: &str = "gestalten-in-code";

struct SettingsStore {
    access: Mutex<()>,
    path: PathBuf,
}

impl SettingsStore {
    fn new(path: PathBuf) -> Self {
        Self {
            access: Mutex::new(()),
            path,
        }
    }

    fn read(&self) -> Result<BTreeMap<String, String>, String> {
        let _access = self
            .access
            .lock()
            .map_err(|_| "Desktop settings are unavailable.".to_owned())?;
        self.read_file()
    }

    fn read_file(&self) -> Result<BTreeMap<String, String>, String> {
        if !self.path.exists() {
            return Ok(BTreeMap::new());
        }
        let Ok(contents) = fs::read_to_string(&self.path) else {
            return Ok(BTreeMap::new());
        };
        let Ok(mut settings) = serde_json::from_str::<BTreeMap<String, String>>(&contents) else {
            return Ok(BTreeMap::new());
        };
        settings.retain(|key, _| ALLOWED_SETTING_KEYS.contains(&key.as_str()));
        Ok(settings)
    }

    fn write(&self, key: &str, value: &str) -> Result<(), String> {
        if !ALLOWED_SETTING_KEYS.contains(&key) {
            return Err("Unsupported setting key.".to_owned());
        }
        let _access = self
            .access
            .lock()
            .map_err(|_| "Desktop settings are unavailable.".to_owned())?;
        let mut settings = self.read_file()?;
        settings.insert(key.to_owned(), value.to_owned());
        let parent = self
            .path
            .parent()
            .ok_or_else(|| "Desktop settings path has no parent.".to_owned())?;
        fs::create_dir_all(parent).map_err(|_| "Unable to prepare desktop settings.".to_owned())?;
        let contents = serde_json::to_vec(&settings)
            .map_err(|_| "Unable to serialize desktop settings.".to_owned())?;
        let mut temporary_file = NamedTempFile::new_in(parent)
            .map_err(|_| "Unable to prepare desktop settings.".to_owned())?;
        temporary_file
            .write_all(&contents)
            .and_then(|()| temporary_file.as_file().sync_all())
            .map_err(|_| "Unable to write desktop settings.".to_owned())?;
        temporary_file
            .persist(&self.path)
            .map_err(|_| "Unable to replace desktop settings.".to_owned())?;
        Ok(())
    }
}

fn resolve_projects_directory(
    app: &AppHandle,
    settings: &SettingsStore,
) -> Result<PathBuf, String> {
    if let Some(configured) = settings.read()?.get("gic.projectsDirectory") {
        if !configured.trim().is_empty() {
            return Ok(PathBuf::from(configured));
        }
    }
    let documents = app
        .path()
        .document_dir()
        .map_err(|_| "Unable to locate the Documents folder.".to_owned())?;
    Ok(documents.join(DEFAULT_WORKSPACE_DIR))
}

fn apply_projects_directory(
    settings: &SettingsStore,
    manager: &WorkspaceManager,
    path: PathBuf,
) -> Result<(), String> {
    settings.write("gic.projectsDirectory", &path.display().to_string())?;
    manager.set_root(path)?;
    manager.reconcile(managed_files::MANAGED_FILES).map(|_| ())
}

#[tauri::command]
fn read_settings(store: State<'_, SettingsStore>) -> Result<BTreeMap<String, String>, String> {
    store.read()
}

#[tauri::command]
fn write_setting(key: &str, value: &str, store: State<'_, SettingsStore>) -> Result<(), String> {
    store.write(key, value)
}

#[tauri::command]
async fn open_gic(
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
                .map_err(|_| "Unable to use the selected sketch.".to_owned())
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
async fn save_gic_as(
    app: AppHandle,
    source: &str,
    suggested_name: &str,
    store: State<'_, DocumentStore>,
    manager: State<'_, WorkspaceManager>,
) -> Result<Option<OpenedDocument>, String> {
    let sketchbook = manager.workspace_root().join("sketches");
    fs::create_dir_all(&sketchbook).map_err(|_| "Unable to prepare the sketchbook.".to_owned())?;
    let selected = app
        .dialog()
        .file()
        .add_filter("GIC sketch", &["gic"])
        .set_directory(&sketchbook)
        .set_file_name(suggested_name)
        .blocking_save_file();
    selected
        .map(|path| {
            path.into_path()
                .map_err(|_| "Unable to use the selected sketch location.".to_owned())
                .map(|path| sketch_path(&sketchbook, path))
                .and_then(|path| store.save_path(path, source))
        })
        .transpose()
}

#[tauri::command]
fn workspace_status(manager: State<'_, WorkspaceManager>) -> Result<WorkspaceStatus, String> {
    manager.status(managed_files::MANAGED_FILES)
}

#[tauri::command]
fn projects_directory(
    app: AppHandle,
    settings: State<'_, SettingsStore>,
) -> Result<String, String> {
    resolve_projects_directory(&app, &settings).map(|path| path.display().to_string())
}

#[tauri::command]
async fn choose_projects_directory(
    app: AppHandle,
    settings: State<'_, SettingsStore>,
    manager: State<'_, WorkspaceManager>,
) -> Result<Option<String>, String> {
    let Some(selected) = app.dialog().file().blocking_pick_folder() else {
        return Ok(None);
    };
    let path = selected
        .into_path()
        .map_err(|_| "Unable to use the selected folder.".to_owned())?;
    apply_projects_directory(&settings, &manager, path.clone())?;
    Ok(Some(path.display().to_string()))
}

#[tauri::command]
async fn show_workspace_notice(
    app: AppHandle,
    settings: State<'_, SettingsStore>,
    manager: State<'_, WorkspaceManager>,
) -> Result<(), String> {
    let Some(suggested) = manager.take_creation_notice() else {
        return Ok(());
    };
    let suggested = PathBuf::from(suggested);
    let use_suggested = app
        .dialog()
        .message(format!(
            "Where should GIC keep your projects?\n\nSuggested folder:\n{}",
            suggested.display()
        ))
        .title("Projects folder")
        .buttons(MessageDialogButtons::OkCancelCustom(
            "Use suggested folder".to_owned(),
            "Choose another folder…".to_owned(),
        ))
        .blocking_show();
    if use_suggested {
        apply_projects_directory(&settings, &manager, suggested)?;
        return Ok(());
    }
    let mut picker = app.dialog().file();
    if let Some(parent) = suggested.parent() {
        picker = picker.set_directory(parent);
    }
    let Some(selected) = picker.blocking_pick_folder() else {
        apply_projects_directory(&settings, &manager, suggested)?;
        return Ok(());
    };
    let selected = selected
        .into_path()
        .map_err(|_| "Unable to use the selected folder.".to_owned())?;
    apply_projects_directory(&settings, &manager, selected.clone())?;
    let _ = app
        .dialog()
        .message(format!(
            "GIC's projects folder is now set to:\n\n{}",
            selected.display()
        ))
        .title("Projects folder")
        .blocking_show();
    Ok(())
}

#[tauri::command]
fn repair_workspace(manager: State<'_, WorkspaceManager>) -> Result<WorkspaceStatus, String> {
    manager.reconcile(managed_files::MANAGED_FILES)
}

#[tauri::command]
fn uninstall_workspace(manager: State<'_, WorkspaceManager>) -> Result<WorkspaceStatus, String> {
    manager.uninstall(managed_files::MANAGED_FILES)
}

#[tauri::command]
fn resolve_workspace_file(
    path: &str,
    resolution: &str,
    manager: State<'_, WorkspaceManager>,
) -> Result<WorkspaceStatus, String> {
    let resolution = match resolution {
        "keep" => Resolution::Keep,
        "replace" => Resolution::Replace,
        _ => return Err("Unsupported resolution.".to_owned()),
    };
    manager.resolve(path, resolution, managed_files::MANAGED_FILES)
}

#[tauri::command]
fn assistant_status() -> Vec<AssistantStatus> {
    external_tools::assistant_status()
}

#[tauri::command]
fn launch_assistant(name: &str, manager: State<'_, WorkspaceManager>) -> Result<(), String> {
    let workspace_root = manager.workspace_root();
    external_tools::launch(name, &workspace_root)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let settings_path = app
                .path()
                .app_config_dir()
                .map_err(std::io::Error::other)?
                .join("settings.json");
            let settings = SettingsStore::new(settings_path);
            let workspace_root = resolve_projects_directory(app.handle(), &settings)?;
            let first_run = !settings.read()?.contains_key("gic.projectsDirectory");
            app.manage(settings);
            app.manage(DocumentStore::default());
            let manifest_path = app
                .path()
                .app_config_dir()
                .map_err(std::io::Error::other)?
                .join("managed-workspace.json");
            app.manage(WorkspaceManager::new(workspace_root.clone(), manifest_path));
            desktop_menu::install(app)?;
            if first_run {
                app.state::<WorkspaceManager>()
                    .record_creation_notice(workspace_root);
            } else if let Err(error) = app
                .state::<WorkspaceManager>()
                .reconcile(managed_files::MANAGED_FILES)
            {
                eprintln!("workspace reconcile failed: {error}");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            assistant_status,
            choose_projects_directory,
            launch_assistant,
            open_gic,
            projects_directory,
            read_settings,
            repair_workspace,
            resolve_workspace_file,
            save_gic,
            save_gic_as,
            show_workspace_notice,
            uninstall_workspace,
            workspace_status,
            write_setting
        ])
        .run(tauri::generate_context!())
        .expect("failed to run the GIC desktop application");
}

#[cfg(test)]
mod tests {
    use super::SettingsStore;
    use std::path::{Path, PathBuf};

    fn remove_test_directory(path: &Path) {
        if path.exists() {
            std::fs::remove_dir_all(path).expect("remove test directory");
        }
    }

    fn test_directory(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "gic-desktop-settings-{}-{name}",
            std::process::id(),
        ))
    }

    #[test]
    fn settings_round_trip_through_an_app_owned_file() {
        let directory = test_directory("round-trip");
        remove_test_directory(&directory);
        let store = SettingsStore::new(directory.join("settings.json"));

        store
            .write("gic.canvasFrame", "false")
            .expect("write setting");

        assert_eq!(
            store
                .read()
                .expect("read settings")
                .get("gic.canvasFrame")
                .map(String::as_str),
            Some("false"),
        );
        remove_test_directory(&directory);
    }

    #[test]
    fn rejects_settings_outside_the_approved_bridge_contract() {
        let directory = test_directory("rejected-key");
        remove_test_directory(&directory);
        let store = SettingsStore::new(directory.join("settings.json"));

        assert_eq!(
            store.write("credential", "must-not-enter-settings"),
            Err("Unsupported setting key.".to_owned()),
        );
        assert!(!directory.exists());
    }

    #[test]
    fn reads_only_settings_in_the_approved_bridge_contract() {
        let directory = test_directory("filtered-read");
        remove_test_directory(&directory);
        std::fs::create_dir_all(&directory).expect("create test directory");
        let path = directory.join("settings.json");
        std::fs::write(
            &path,
            r#"{"credential":"must-not-enter-webview","gic.canvasFrame":"true"}"#,
        )
        .expect("write settings fixture");
        let store = SettingsStore::new(path);

        let settings = store.read().expect("read settings");

        assert_eq!(settings.len(), 1);
        assert_eq!(
            settings.get("gic.canvasFrame").map(String::as_str),
            Some("true"),
        );
        remove_test_directory(&directory);
    }

    #[test]
    fn invalid_settings_recover_to_safe_defaults() {
        let directory = test_directory("invalid-settings");
        remove_test_directory(&directory);
        std::fs::create_dir_all(&directory).expect("create test directory");
        let path = directory.join("settings.json");
        std::fs::write(&path, r#"{"gic.canvasFrame":"#)
            .expect("write interrupted settings fixture");
        let store = SettingsStore::new(path);

        assert_eq!(store.read(), Ok(Default::default()));
        store
            .write("gic.canvasFrame", "false")
            .expect("replace invalid settings");
        assert_eq!(
            store
                .read()
                .expect("read repaired settings")
                .get("gic.canvasFrame")
                .map(String::as_str),
            Some("false"),
        );
        remove_test_directory(&directory);
    }

    #[test]
    fn non_text_settings_recover_to_safe_defaults() {
        let directory = test_directory("non-text-settings");
        remove_test_directory(&directory);
        std::fs::create_dir_all(&directory).expect("create test directory");
        let path = directory.join("settings.json");
        std::fs::write(&path, [0xff, 0xfe, 0xfd]).expect("write non-text settings fixture");
        let store = SettingsStore::new(path);

        assert_eq!(store.read(), Ok(Default::default()));
        remove_test_directory(&directory);
    }
}
