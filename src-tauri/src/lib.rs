// ABOUTME: Implements the narrow native boundary for the GIC desktop application.
// ABOUTME: Persists approved non-secret settings without exposing filesystem paths.

use std::{collections::BTreeMap, fs, io::Write, path::PathBuf, sync::Mutex};
use tauri::{Manager, State};
use tempfile::NamedTempFile;

const ALLOWED_SETTING_KEYS: [&str; 3] =
    ["gic.canvasFrame", "gic.formatOnSave", "gic.workspaceLayout"];

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

#[tauri::command]
fn read_settings(store: State<'_, SettingsStore>) -> Result<BTreeMap<String, String>, String> {
    store.read()
}

#[tauri::command]
fn write_setting(key: &str, value: &str, store: State<'_, SettingsStore>) -> Result<(), String> {
    store.write(key, value)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let settings_path = app
                .path()
                .app_config_dir()
                .map_err(std::io::Error::other)?
                .join("settings.json");
            app.manage(SettingsStore::new(settings_path));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![read_settings, write_setting])
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
