// ABOUTME: Implements the narrow native boundary for the GIC desktop application.
// ABOUTME: Persists approved non-secret settings without exposing filesystem paths.

mod agent;
mod codex_auth;
mod codex_session;
mod credentials;
mod desktop_menu;
mod documents;
mod examples;
mod exports;
mod external_tools;
mod managed_files;
mod model_capabilities;
mod reference;
mod sessions;
mod workspace;

use agent::{
    cancel_opencode_request, codex_models, go_models, opencode_models, openrouter_models,
    send_opencode_request, TutorState,
};
use codex_auth::{cancel_codex_login, start_codex_login, CodexAuth, VERIFY_URL};
use codex_session::CodexSession;
use credentials::{CredentialStatus, CredentialStore};
use documents::{sketch_path, DocumentStore, OpenedDocument};
use exports::ExportFormat;
use external_tools::AssistantStatus;
use sessions::{SessionRecord, SessionStore, SessionSummary};
use std::{
    collections::BTreeMap,
    fs,
    io::Write,
    path::{Path, PathBuf},
    process::Command,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
};
use tauri::{ipc::Request, AppHandle, Manager, State};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tauri_plugin_opener::OpenerExt;
use tempfile::NamedTempFile;
use workspace::{Resolution, WorkspaceManager, WorkspaceStatus};

const ALLOWED_SETTING_KEYS: [&str; 9] = [
    "gic.appearance",
    "gic.canvasFrame",
    "gic.darkTheme",
    "gic.formatOnSave",
    "gic.lightTheme",
    "gic.projectsDirectory",
    "gic.tutor.enabled-model-ids",
    "gic.tutor.selected-model",
    "gic.workspaceLayout",
];

const DEFAULT_WORKSPACE_DIR: &str = "gestalten-in-code";

struct SettingsStore {
    access: Mutex<()>,
    path: PathBuf,
    layout_path: PathBuf,
}

impl SettingsStore {
    fn new(path: PathBuf) -> Self {
        let layout_path = path.with_file_name("workspace-layout.json");
        Self {
            access: Mutex::new(()),
            path,
            layout_path,
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
        let mut settings = if self.path.exists() {
            let Ok(contents) = fs::read_to_string(&self.path) else {
                return Ok(BTreeMap::new());
            };
            let Ok(settings) = serde_json::from_str::<BTreeMap<String, String>>(&contents) else {
                return Ok(BTreeMap::new());
            };
            settings
        } else {
            BTreeMap::new()
        };
        settings.retain(|key, _| ALLOWED_SETTING_KEYS.contains(&key.as_str()));
        if let Some(embedded_layout) = settings.remove("gic.workspaceLayout") {
            if !self.layout_path.exists() {
                if let Ok(layout) = serde_json::from_str::<serde_json::Value>(&embedded_layout) {
                    let _ = self.write_layout(&layout);
                }
            }
            self.persist_settings(&settings)?;
        }
        if self.layout_path.exists() {
            if let Ok(layout) = fs::read_to_string(&self.layout_path) {
                settings.insert("gic.workspaceLayout".to_owned(), layout);
            }
        }
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
        if key == "gic.workspaceLayout" {
            let layout = serde_json::from_str::<serde_json::Value>(value)
                .map_err(|_| "Unable to save desktop settings.".to_owned())?;
            self.write_layout(&layout)?;
            return Ok(());
        }
        settings.insert(key.to_owned(), value.to_owned());
        self.persist_settings(&settings)
    }

    fn persist_settings(&self, settings: &BTreeMap<String, String>) -> Result<(), String> {
        let parent = self
            .path
            .parent()
            .ok_or_else(|| "Desktop settings path has no parent.".to_owned())?;
        fs::create_dir_all(parent).map_err(|_| "Unable to prepare desktop settings.".to_owned())?;
        let contents = serde_json::to_vec(settings)
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

    fn write_layout(&self, layout: &serde_json::Value) -> Result<(), String> {
        let parent = self
            .layout_path
            .parent()
            .ok_or_else(|| "Workspace layout path has no parent.".to_owned())?;
        fs::create_dir_all(parent).map_err(|_| "Unable to prepare workspace layout.".to_owned())?;
        let contents = serde_json::to_vec_pretty(layout)
            .map_err(|_| "Unable to serialize workspace layout.".to_owned())?;
        let mut temporary_file = NamedTempFile::new_in(parent)
            .map_err(|_| "Unable to prepare workspace layout.".to_owned())?;
        temporary_file
            .write_all(&contents)
            .and_then(|()| temporary_file.as_file().sync_all())
            .map_err(|_| "Unable to write workspace layout.".to_owned())?;
        temporary_file
            .persist(&self.layout_path)
            .map_err(|_| "Unable to replace workspace layout.".to_owned())?;
        Ok(())
    }
}

fn app_configuration_directory(app: &AppHandle) -> Result<PathBuf, std::io::Error> {
    Ok(app
        .path()
        .home_dir()
        .map_err(std::io::Error::other)?
        .join(".config")
        .join("gestalten-in-code"))
}

fn migrate_platform_configuration(
    app: &AppHandle,
    destination: &Path,
) -> Result<(), std::io::Error> {
    let legacy_directory = app.path().app_config_dir().map_err(std::io::Error::other)?;
    fs::create_dir_all(destination)?;
    for name in ["settings.json", "auth.json", "managed-workspace.json"] {
        let legacy_path = legacy_directory.join(name);
        let destination_path = destination.join(name);
        if legacy_path.exists() && !destination_path.exists() {
            fs::rename(legacy_path, destination_path)?;
        }
    }
    Ok(())
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
    _sessions: &SessionStore,
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
    manager: State<'_, WorkspaceManager>,
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
                .and_then(|path| store.open_path(path, &manager.workspace_root().join("sketches")))
        })
        .transpose()
}

#[tauri::command]
fn accept_open_gic(document_id: &str, store: State<'_, DocumentStore>) -> Result<(), String> {
    store.accept_open(document_id)
}

#[tauri::command]
fn cancel_open_gic(document_id: &str, store: State<'_, DocumentStore>) -> Result<(), String> {
    store.cancel_open(document_id)
}

#[tauri::command]
fn save_gic(
    document_id: &str,
    source: &str,
    description: Option<&str>,
    store: State<'_, DocumentStore>,
) -> Result<(), String> {
    store.save(document_id, source, description)
}

fn save_document_copy(
    store: &DocumentStore,
    sessions: &SessionStore,
    source_directory: Option<&Path>,
    target_path: PathBuf,
    source: &str,
    description: Option<&str>,
    sketchbook: &Path,
) -> Result<OpenedDocument, String> {
    let target_directory = target_path
        .parent()
        .ok_or_else(|| "The selected sketch path has no parent.".to_owned())?
        .to_path_buf();
    let copied_session = source_directory
        .map(|source| sessions.clone_latest_between(source, &target_directory))
        .transpose()?
        .flatten();
    match store.save_path_pending(target_path, source, description, sketchbook) {
        Ok(saved) => Ok(saved),
        Err(error) => {
            if let Some(session_id) = copied_session {
                sessions.remove_in(&target_directory, &session_id)?;
            }
            Err(error)
        }
    }
}

#[tauri::command]
async fn save_gic_as(
    app: AppHandle,
    source: &str,
    suggested_name: &str,
    description: Option<&str>,
    store: State<'_, DocumentStore>,
    manager: State<'_, WorkspaceManager>,
    sessions: State<'_, SessionStore>,
) -> Result<Option<OpenedDocument>, String> {
    let source_sketch_dir = store
        .active_path()
        .and_then(|path| path.parent().map(Path::to_path_buf));
    let sketchbook = manager.workspace_root().join("sketches");
    fs::create_dir_all(&sketchbook).map_err(|_| "Unable to prepare the sketchbook.".to_owned())?;
    let selected = app
        .dialog()
        .file()
        .set_title("Save Sketch Folder As…")
        .set_directory(&sketchbook)
        .set_file_name(suggested_name)
        .blocking_save_file();
    selected
        .map(|path| {
            path.into_path()
                .map_err(|_| "Unable to use the selected sketch location.".to_owned())
                .map(|path| sketch_path(&sketchbook, path))
                .and_then(|path| {
                    save_document_copy(
                        &store,
                        &sessions,
                        source_sketch_dir.as_deref(),
                        path,
                        source,
                        description,
                        &sketchbook,
                    )
                })
        })
        .transpose()
}

async fn save_export(
    app: AppHandle,
    format: ExportFormat,
    contents: Vec<u8>,
) -> Result<bool, String> {
    let (sender, receiver) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .set_title(format.title())
        .add_filter(format.filter(), &[format.extension()])
        .set_file_name(format.file_name())
        .save_file(move |selected| {
            let _ = sender.send(selected);
        });
    let selected = receiver
        .await
        .map_err(|_| "Unable to select export location.".to_owned())?;
    let Some(selected) = selected else {
        return Ok(false);
    };
    let path = selected
        .into_path()
        .map_err(|_| "Unable to use the selected export location.".to_owned())?;
    tauri::async_runtime::spawn_blocking(move || {
        exports::save_export_bytes(&path, format, &contents)
    })
    .await
    .map_err(|_| "Unable to save export.".to_owned())??;
    Ok(true)
}

#[tauri::command]
async fn save_png_export(app: AppHandle, request: Request<'_>) -> Result<bool, String> {
    let contents = exports::export_contents(request.body())?;
    save_export(app, ExportFormat::Png, contents).await
}

#[tauri::command]
async fn save_html_export(app: AppHandle, request: Request<'_>) -> Result<bool, String> {
    let contents = exports::export_contents(request.body())?;
    save_export(app, ExportFormat::Html, contents).await
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
fn existing_sketch_names(manager: State<'_, WorkspaceManager>) -> Result<Vec<String>, String> {
    let sketchbook = manager.workspace_root().join("sketches");
    documents::existing_sketch_names(&sketchbook)
}

#[tauri::command]
fn active_sketch_dir(document_store: &DocumentStore, document_id: &str) -> Result<PathBuf, String> {
    let path = document_store
        .active_path()
        .filter(|_| !document_id.is_empty())
        .ok_or_else(|| "Save the sketch before starting an Agent session.".to_owned())?;
    path.parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "The sketch has no session folder.".to_owned())
}

#[tauri::command]
fn create_agent_session(
    name: &str,
    document_id: &str,
    documents: State<'_, DocumentStore>,
    sessions: State<'_, SessionStore>,
) -> Result<String, String> {
    sessions.create_in(&active_sketch_dir(&documents, document_id)?, name)
}

#[tauri::command]
fn clone_agent_session(
    document_id: &str,
    sessions: State<'_, SessionStore>,
    documents: State<'_, DocumentStore>,
) -> Result<Option<String>, String> {
    let sketch_dir = active_sketch_dir(&documents, document_id)?;
    sessions.clone_latest_between(&sketch_dir, &sketch_dir)
}

#[tauri::command]
fn append_agent_message(
    document_id: &str,
    session_id: &str,
    role: &str,
    text: &str,
    documents: State<'_, DocumentStore>,
    sessions: State<'_, SessionStore>,
) -> Result<(), String> {
    sessions.append_in(
        &active_sketch_dir(&documents, document_id)?,
        session_id,
        role,
        text,
    )
}

#[tauri::command]
fn read_agent_session(
    document_id: &str,
    session_id: &str,
    documents: State<'_, DocumentStore>,
    sessions: State<'_, SessionStore>,
) -> Result<Vec<SessionRecord>, String> {
    sessions.read_in(&active_sketch_dir(&documents, document_id)?, session_id)
}

#[tauri::command]
fn find_agent_session(
    document_id: &str,
    documents: State<'_, DocumentStore>,
    sessions: State<'_, SessionStore>,
) -> Result<Option<SessionSummary>, String> {
    sessions.latest_summary(&active_sketch_dir(&documents, document_id)?)
}

#[tauri::command]
async fn choose_projects_directory(
    app: AppHandle,
    settings: State<'_, SettingsStore>,
    manager: State<'_, WorkspaceManager>,
    sessions: State<'_, SessionStore>,
) -> Result<Option<String>, String> {
    let Some(selected) = app.dialog().file().blocking_pick_folder() else {
        return Ok(None);
    };
    let path = selected
        .into_path()
        .map_err(|_| "Unable to use the selected folder.".to_owned())?;
    apply_projects_directory(&settings, &manager, &sessions, path.clone())?;
    Ok(Some(path.display().to_string()))
}

async fn run_projects_dialog(app: AppHandle) -> Result<(), String> {
    let Some(suggested) = app.state::<WorkspaceManager>().take_creation_notice() else {
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
        apply_projects_directory(
            &app.state::<SettingsStore>(),
            &app.state::<WorkspaceManager>(),
            &app.state::<SessionStore>(),
            suggested,
        )?;
        return Ok(());
    }
    let mut picker = app.dialog().file();
    if let Some(parent) = suggested.parent() {
        picker = picker.set_directory(parent);
    }
    let Some(selected) = picker.blocking_pick_folder() else {
        apply_projects_directory(
            &app.state::<SettingsStore>(),
            &app.state::<WorkspaceManager>(),
            &app.state::<SessionStore>(),
            suggested,
        )?;
        return Ok(());
    };
    let selected = selected
        .into_path()
        .map_err(|_| "Unable to use the selected folder.".to_owned())?;
    apply_projects_directory(
        &app.state::<SettingsStore>(),
        &app.state::<WorkspaceManager>(),
        &app.state::<SessionStore>(),
        selected.clone(),
    )?;
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
async fn show_workspace_notice(app: AppHandle) -> Result<(), String> {
    run_projects_dialog(app).await
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
fn provider_credential_status(
    store: State<'_, CredentialStore>,
) -> Result<CredentialStatus, String> {
    store.status()
}

#[tauri::command]
fn authenticate_opencode(
    api_key: String,
    store: State<'_, CredentialStore>,
) -> Result<CredentialStatus, String> {
    store.authenticate_opencode(&api_key)?;
    store.status()
}

#[tauri::command]
fn sign_out_opencode(store: State<'_, CredentialStore>) -> Result<CredentialStatus, String> {
    store.sign_out_opencode()?;
    store.status()
}

#[tauri::command]
fn authenticate_go(
    api_key: String,
    store: State<'_, CredentialStore>,
) -> Result<CredentialStatus, String> {
    store.authenticate_go(&api_key)?;
    store.status()
}

#[tauri::command]
fn sign_out_go(store: State<'_, CredentialStore>) -> Result<CredentialStatus, String> {
    store.sign_out_go()?;
    store.status()
}

#[tauri::command]
fn sign_out_codex(
    store: State<'_, CredentialStore>,
    auth: State<'_, CodexAuth>,
    tutor: State<'_, TutorState>,
) -> Result<CredentialStatus, String> {
    tutor.cancel_codex()?;
    auth.sign_out(&store)?;
    store.status()
}

#[tauri::command]
fn open_codex_verification(app: AppHandle) -> Result<(), String> {
    app.opener()
        .open_url(VERIFY_URL, None::<&str>)
        .map_err(|_| "Could not open the Codex verification page.".to_owned())
}

#[tauri::command]
fn authenticate_openrouter(
    api_key: String,
    store: State<'_, CredentialStore>,
) -> Result<CredentialStatus, String> {
    store.authenticate_openrouter(&api_key)?;
    store.status()
}

#[tauri::command]
fn sign_out_openrouter(store: State<'_, CredentialStore>) -> Result<CredentialStatus, String> {
    store.sign_out_openrouter()?;
    store.status()
}

#[tauri::command]
fn assistant_status() -> Vec<AssistantStatus> {
    external_tools::assistant_status()
}

#[tauri::command]
fn reveal_sketch_folder(
    store: State<'_, DocumentStore>,
    manager: State<'_, WorkspaceManager>,
) -> Result<(), String> {
    let target = store
        .active_path()
        .and_then(|path| path.parent().map(Path::to_path_buf))
        .unwrap_or_else(|| manager.workspace_root());
    reveal_folder(&target)
}

fn reveal_folder(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let result = Command::new("open").arg(path).spawn();
    #[cfg(target_os = "windows")]
    let result = Command::new("explorer").arg(path).spawn();
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let result = Command::new("xdg-open").arg(path).spawn();

    result
        .map(|_| ())
        .map_err(|_| "Unable to open the folder.".to_owned())
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
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let configuration_directory = app_configuration_directory(app.handle())?;
            migrate_platform_configuration(app.handle(), &configuration_directory)?;
            let settings_path = configuration_directory.join("settings.json");
            let settings = SettingsStore::new(settings_path);
            let credential_path = configuration_directory.join("auth.json");
            let workspace_root = resolve_projects_directory(app.handle(), &settings)?;
            let first_run = !workspace_root.exists();
            app.manage(settings);
            app.manage(CredentialStore::new(credential_path));
            app.manage(CodexAuth::default());
            app.manage(CodexSession::default());
            app.manage(TutorState::default());
            app.manage(DocumentStore::default());
            app.manage(SessionStore);
            let manifest_path = configuration_directory.join("managed-workspace.json");
            app.manage(WorkspaceManager::new(workspace_root.clone(), manifest_path));
            desktop_menu::install(app)?;
            if first_run {
                app.state::<WorkspaceManager>()
                    .record_creation_notice(workspace_root);
                if let Some(window) = app.get_webview_window("main") {
                    let app_handle = app.handle().clone();
                    let prompted = Arc::new(AtomicBool::new(false));
                    window.on_window_event(move |event| {
                        if let tauri::WindowEvent::Focused(true) = event {
                            if prompted.swap(true, Ordering::SeqCst) {
                                return;
                            }
                            let app_handle = app_handle.clone();
                            tauri::async_runtime::spawn(async move {
                                if let Err(error) = run_projects_dialog(app_handle).await {
                                    eprintln!("projects dialog failed: {error}");
                                }
                            });
                        }
                    });
                }
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
            authenticate_opencode,
            authenticate_go,
            authenticate_openrouter,
            cancel_codex_login,
            cancel_opencode_request,
            codex_models,
            opencode_models,
            go_models,
            open_codex_verification,
            openrouter_models,
            send_opencode_request,
            provider_credential_status,
            sign_out_opencode,
            sign_out_go,
            sign_out_codex,
            sign_out_openrouter,
            start_codex_login,
            choose_projects_directory,
            launch_assistant,
            open_gic,
            accept_open_gic,
            cancel_open_gic,
            projects_directory,
            existing_sketch_names,
            create_agent_session,
            clone_agent_session,
            append_agent_message,
            read_agent_session,
            find_agent_session,
            read_settings,
            repair_workspace,
            resolve_workspace_file,
            reveal_sketch_folder,
            save_gic,
            save_gic_as,
            save_png_export,
            save_html_export,
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
    use super::{
        codex_auth::CodexAuth, credentials::CredentialStore, save_document_copy, SettingsStore,
    };
    use crate::{documents::DocumentStore, sessions::SessionStore};
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
    fn failed_save_as_cleans_up_the_copied_session_and_preserves_target_source() {
        let directory = test_directory("save-as-session-failure");
        remove_test_directory(&directory);
        let source_directory = directory.join("sketches/source");
        let target_directory = directory.join("sketches/copy");
        std::fs::create_dir_all(&source_directory).expect("create source folder");
        std::fs::create_dir_all(&target_directory).expect("create target folder");
        std::fs::write(source_directory.join("source.gic"), "source").expect("write source sketch");
        std::fs::write(target_directory.join("copy.gic"), "previous target")
            .expect("write existing target");
        std::fs::create_dir(target_directory.join("description.md"))
            .expect("block description write");
        let sessions = SessionStore;
        sessions
            .create_in(&source_directory, "A session")
            .expect("create source session");

        let result = save_document_copy(
            &DocumentStore::default(),
            &sessions,
            Some(&source_directory),
            target_directory.join("copy.gic"),
            "replacement target",
            Some("description"),
            &directory.join("sketches"),
        );

        assert!(result.is_err());
        assert_eq!(
            std::fs::read_to_string(target_directory.join("copy.gic")).unwrap(),
            "previous target"
        );
        assert_eq!(
            std::fs::read_dir(target_directory.join("sessions"))
                .expect("read target sessions")
                .count(),
            0
        );
        assert_eq!(
            std::fs::read_dir(source_directory.join("sessions"))
                .expect("read source sessions")
                .count(),
            1
        );
        remove_test_directory(&directory);
    }

    #[test]
    fn credentials_round_trip_without_exposing_the_key() {
        let directory = test_directory("credentials-round-trip");
        remove_test_directory(&directory);
        let store = CredentialStore::new(directory.join("auth.json"));

        store
            .authenticate_opencode("synthetic-secret")
            .expect("store key");

        assert!(store.status().expect("read status").opencode_authenticated);
        assert!(!format!("{:?}", store.status().expect("read status")).contains("synthetic-secret"));
        assert!(std::fs::read_to_string(directory.join("auth.json"))
            .expect("read auth file")
            .contains("synthetic-secret"));
        remove_test_directory(&directory);
    }

    #[test]
    fn codex_device_authorization_serializes_only_the_verification_instructions() {
        let authorization =
            CodexAuth::device_authorization_for_test("https://auth.example/device", "ABCD-EFGH");

        assert_eq!(
            serde_json::to_value(authorization).expect("serialize authorization"),
            serde_json::json!({
                "kind": "deviceAuthorization",
                "attemptId": 1,
                "url": "https://auth.example/device",
                "userCode": "ABCD-EFGH"
            })
        );
    }

    #[test]
    fn codex_refresh_credentials_survive_restart_without_entering_status() {
        let directory = test_directory("codex-credentials-restart");
        remove_test_directory(&directory);
        let path = directory.join("auth.json");
        let store = CredentialStore::new(path.clone());

        store
            .authenticate_codex("synthetic-access", "synthetic-refresh", "synthetic-account")
            .expect("store Codex credentials");

        let restarted = CredentialStore::new(path.clone());
        let status = restarted.status().expect("read redacted status");
        assert!(status.codex_authenticated);
        assert!(!format!("{status:?}").contains("synthetic-"));
        assert_eq!(
            restarted
                .with_codex_credentials(|access, refresh, account| {
                    (access.to_owned(), refresh.to_owned(), account.to_owned())
                })
                .expect("read native credentials"),
            (
                "synthetic-access".to_owned(),
                "synthetic-refresh".to_owned(),
                "synthetic-account".to_owned()
            )
        );
        restarted.sign_out_codex().expect("sign out Codex");
        assert!(!restarted.status().expect("read status").codex_authenticated);
        assert!(!path.exists());
        remove_test_directory(&directory);
    }

    #[test]
    fn codex_refresh_cannot_restore_a_signed_out_or_replaced_account() {
        let directory = test_directory("codex-refresh-rotation");
        remove_test_directory(&directory);
        let store = CredentialStore::new(directory.join("auth.json"));
        store
            .authenticate_codex("first-access", "first-refresh", "first-account")
            .unwrap();

        assert!(store
            .replace_codex_if_current(
                "first-refresh",
                "first-account",
                "rotated-access",
                "rotated-refresh",
            )
            .unwrap());
        assert!(!store
            .replace_codex_if_current(
                "first-refresh",
                "first-account",
                "stale-access",
                "stale-refresh",
            )
            .unwrap());
        store.sign_out_codex().unwrap();
        assert!(!store
            .replace_codex_if_current(
                "rotated-refresh",
                "first-account",
                "late-access",
                "late-refresh",
            )
            .unwrap());
        store
            .authenticate_codex("other-access", "other-refresh", "other-account")
            .unwrap();
        assert!(!store
            .replace_codex_if_current(
                "rotated-refresh",
                "first-account",
                "late-access",
                "late-refresh",
            )
            .unwrap());
        assert_eq!(
            store
                .with_codex_credentials(|access, refresh, account| {
                    (access.to_owned(), refresh.to_owned(), account.to_owned())
                })
                .unwrap(),
            (
                "other-access".to_owned(),
                "other-refresh".to_owned(),
                "other-account".to_owned(),
            )
        );
        remove_test_directory(&directory);
    }

    #[test]
    fn openrouter_credentials_round_trip_and_sign_out_independently() {
        let directory = test_directory("openrouter-credentials");
        remove_test_directory(&directory);
        let store = CredentialStore::new(directory.join("auth.json"));
        store
            .authenticate_opencode("zen-secret")
            .expect("store Zen key");
        store
            .authenticate_openrouter("openrouter-secret")
            .expect("store OpenRouter key");

        let status = store.status().expect("read status");
        assert!(status.opencode_authenticated);
        assert!(status.openrouter_authenticated);
        assert!(!format!("{status:?}").contains("openrouter-secret"));

        store.sign_out_openrouter().expect("sign out OpenRouter");
        let status = store.status().expect("read status");
        assert!(status.opencode_authenticated);
        assert!(!status.openrouter_authenticated);
        assert!(directory.join("auth.json").exists());
        remove_test_directory(&directory);
    }

    #[test]
    fn go_credentials_are_private_and_independent_of_zen() {
        let directory = test_directory("go-credentials");
        remove_test_directory(&directory);
        let auth_path = directory.join("auth.json");
        let store = CredentialStore::new(auth_path.clone());
        store.authenticate_opencode("zen-synthetic").unwrap();
        store.authenticate_go("go-synthetic").unwrap();
        let status = store.status().unwrap();
        assert!(status.opencode_authenticated);
        assert!(status.go_authenticated);
        assert!(!format!("{status:?}").contains("go-synthetic"));
        assert_eq!(store.with_go_key(str::to_owned).unwrap(), "go-synthetic");

        store.sign_out_go().unwrap();
        let status = store.status().unwrap();
        assert!(status.opencode_authenticated);
        assert!(!status.go_authenticated);
        let contents = std::fs::read_to_string(&auth_path).unwrap();
        assert!(!contents.contains("go-synthetic"));
        assert!(contents.contains("zen-synthetic"));
        store.sign_out_opencode().unwrap();
        assert!(!auth_path.exists());
        remove_test_directory(&directory);
    }

    #[test]
    fn provider_sign_out_preserves_the_other_key_and_deletes_the_last_key() {
        let directory = test_directory("provider-sign-out-isolation");
        remove_test_directory(&directory);
        let auth_path = directory.join("auth.json");
        let store = CredentialStore::new(auth_path.clone());
        store
            .authenticate_opencode("zen-synthetic")
            .expect("store Zen key");
        store
            .authenticate_openrouter("openrouter-synthetic")
            .expect("store OpenRouter key");

        store.sign_out_opencode().expect("sign out Zen");

        let status = store.status().expect("read status");
        assert!(!status.opencode_authenticated);
        assert!(status.openrouter_authenticated);
        let contents = std::fs::read_to_string(&auth_path).expect("read auth file");
        assert!(!contents.contains("zen-synthetic"));
        assert!(contents.contains("openrouter-synthetic"));
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mode = std::fs::metadata(&auth_path)
                .expect("auth metadata")
                .permissions()
                .mode();
            assert_eq!(mode & 0o777, 0o600);
        }

        store
            .authenticate_opencode("zen-synthetic")
            .expect("restore Zen key");
        store.sign_out_openrouter().expect("sign out OpenRouter");

        let status = store.status().expect("read status");
        assert!(status.opencode_authenticated);
        assert!(!status.openrouter_authenticated);
        let contents = std::fs::read_to_string(&auth_path).expect("read auth file");
        assert!(contents.contains("zen-synthetic"));
        assert!(!contents.contains("openrouter-synthetic"));
        store.sign_out_opencode().expect("sign out final provider");
        assert!(!auth_path.exists());
        remove_test_directory(&directory);
    }

    #[test]
    fn credentials_are_replaced_atomically_and_sign_out_deletes_them() {
        let directory = test_directory("credentials-replace");
        remove_test_directory(&directory);
        let store = CredentialStore::new(directory.join("auth.json"));
        store
            .authenticate_opencode("first-secret")
            .expect("store first key");
        store
            .authenticate_opencode("second-secret")
            .expect("replace key");

        assert!(!std::fs::read_to_string(directory.join("auth.json"))
            .expect("read auth file")
            .contains("first-secret"));
        store.sign_out_opencode().expect("sign out");
        assert!(!store.status().expect("read status").opencode_authenticated);
        assert!(!directory.join("auth.json").exists());
        remove_test_directory(&directory);
    }

    #[test]
    fn credential_file_uses_owner_only_permissions() {
        let directory = test_directory("credentials-permissions");
        remove_test_directory(&directory);
        let store = CredentialStore::new(directory.join("auth.json"));
        store
            .authenticate_opencode("synthetic-secret")
            .expect("store key");

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mode = std::fs::metadata(directory.join("auth.json"))
                .expect("auth metadata")
                .permissions()
                .mode();
            assert_eq!(mode & 0o777, 0o600);
        }
        remove_test_directory(&directory);
    }

    #[test]
    fn insecure_credential_files_are_rejected_without_being_repaired_silently() {
        let directory = test_directory("credentials-insecure");
        remove_test_directory(&directory);
        std::fs::create_dir_all(&directory).expect("create test directory");
        let path = directory.join("auth.json");
        std::fs::write(&path, r#"{"opencode_api_key":"synthetic-secret"}"#)
            .expect("write credential fixture");
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o644))
                .expect("make credential fixture insecure");
        }
        let store = CredentialStore::new(path.clone());

        assert!(store.status().is_err());
        assert!(store.authenticate_opencode("replacement-secret").is_err());
        assert_eq!(
            std::fs::read_to_string(path).expect("read rejected fixture"),
            r#"{"opencode_api_key":"synthetic-secret"}"#
        );
        remove_test_directory(&directory);
    }

    #[test]
    fn workspace_layout_is_stored_as_readable_json() {
        let directory = test_directory("settings-readable-layout");
        remove_test_directory(&directory);
        let store = SettingsStore::new(directory.join("settings.json"));
        let layout = r#"{"layout":{"type":"row"},"version":7}"#;

        store
            .write("gic.workspaceLayout", layout)
            .expect("write workspace layout");

        let stored = std::fs::read_to_string(directory.join("workspace-layout.json"))
            .expect("read workspace layout");
        assert!(stored.contains("\n  \"layout\""));
        assert!(!directory.join("settings.json").exists());
        assert!(store
            .read()
            .expect("read saved layout")
            .contains_key("gic.workspaceLayout"));
        remove_test_directory(&directory);
    }

    #[test]
    fn embedded_workspace_layout_is_migrated_to_its_own_file() {
        let directory = test_directory("settings-layout-migration");
        remove_test_directory(&directory);
        std::fs::create_dir_all(&directory).expect("create test directory");
        std::fs::write(
            directory.join("settings.json"),
            r#"{"gic.workspaceLayout":"{\"layout\":{\"type\":\"row\"},\"version\":7}"}"#,
        )
        .expect("write embedded layout fixture");
        let store = SettingsStore::new(directory.join("settings.json"));

        let settings = store.read().expect("read migrated settings");

        assert!(settings.contains_key("gic.workspaceLayout"));
        assert!(directory.join("workspace-layout.json").is_file());
        remove_test_directory(&directory);
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
    fn tutor_model_preferences_persist_across_settings_store_instances() {
        let directory = test_directory("tutor-model-preferences");
        remove_test_directory(&directory);
        let path = directory.join("settings.json");
        let store = SettingsStore::new(path.clone());

        store
            .write("gic.tutor.enabled-model-ids", r#"["zen/alpha","zen/beta"]"#)
            .expect("write enabled model IDs");
        store
            .write("gic.tutor.selected-model", "zen/beta")
            .expect("write selected model");

        let restored = SettingsStore::new(path)
            .read()
            .expect("read saved settings");

        assert_eq!(
            restored
                .get("gic.tutor.enabled-model-ids")
                .map(String::as_str),
            Some(r#"["zen/alpha","zen/beta"]"#),
        );
        assert_eq!(
            restored.get("gic.tutor.selected-model").map(String::as_str),
            Some("zen/beta"),
        );
        assert_eq!(
            store.write("credential", "must-not-enter-settings"),
            Err("Unsupported setting key.".to_owned()),
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
