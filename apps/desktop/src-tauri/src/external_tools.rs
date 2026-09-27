// ABOUTME: Detects installed Codex and OpenCode CLIs and opens a terminal in the workspace.
// ABOUTME: Keeps external-assistant launch behind explicit, labeled actions.

use serde::Serialize;
use std::{
    ffi::OsString,
    path::{Path, PathBuf},
    process::Command,
};

pub(crate) const ASSISTANTS: [&str; 2] = ["codex", "opencode"];

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AssistantStatus {
    pub(crate) name: String,
    pub(crate) available: bool,
}

pub(crate) fn assistant_status() -> Vec<AssistantStatus> {
    ASSISTANTS
        .iter()
        .map(|name| AssistantStatus {
            name: (*name).to_owned(),
            available: detect(name),
        })
        .collect()
}

pub(crate) fn launch(assistant: &str, directory: &Path) -> Result<(), String> {
    if !ASSISTANTS.contains(&assistant) {
        return Err("Unknown assistant.".to_owned());
    }
    if !detect(assistant) {
        return Err("The assistant is not installed.".to_owned());
    }
    launch_terminal(directory)
}

pub(crate) fn detect(executable: &str) -> bool {
    match std::env::var_os("PATH") {
        Some(path) => {
            let dirs: Vec<PathBuf> = std::env::split_paths(&path).collect();
            detect_in_paths(executable, &dirs)
        }
        None => false,
    }
}

pub(crate) fn detect_in_paths(executable: &str, dirs: &[PathBuf]) -> bool {
    dirs.iter().any(|dir| {
        candidate_names(executable)
            .iter()
            .any(|name| executable_at(&dir.join(name)))
    })
}

fn candidate_names(executable: &str) -> Vec<OsString> {
    #[cfg(target_os = "windows")]
    {
        return vec![
            OsString::from(executable),
            OsString::from(format!("{executable}.exe")),
            OsString::from(format!("{executable}.cmd")),
            OsString::from(format!("{executable}.bat")),
        ];
    }
    #[cfg(not(target_os = "windows"))]
    {
        vec![OsString::from(executable)]
    }
}

fn executable_at(path: &Path) -> bool {
    if !path.is_file() {
        return false;
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        path.metadata()
            .map(|metadata| metadata.permissions().mode() & 0o111 != 0)
            .unwrap_or(false)
    }
    #[cfg(not(unix))]
    {
        true
    }
}

#[cfg(target_os = "macos")]
fn launch_terminal(directory: &Path) -> Result<(), String> {
    Command::new("/usr/bin/open")
        .args(["-a", "Terminal"])
        .arg(directory)
        .status()
        .map(|_| ())
        .map_err(|_| "Unable to open a terminal.".to_owned())
}

#[cfg(target_os = "windows")]
fn launch_terminal(directory: &Path) -> Result<(), String> {
    Command::new("cmd")
        .args(["/C", "start", "", "/D"])
        .arg(directory)
        .arg("cmd.exe")
        .status()
        .map(|_| ())
        .map_err(|_| "Unable to open a terminal.".to_owned())
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn launch_terminal(_directory: &Path) -> Result<(), String> {
    Err("Opening a terminal is not supported on this system.".to_owned())
}

#[cfg(test)]
mod tests {
    use super::{candidate_names, detect_in_paths};
    use std::path::PathBuf;

    fn test_directory(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "gic-desktop-external-tools-{}-{name}",
            std::process::id(),
        ))
    }

    #[test]
    fn finds_an_executable_on_the_path() {
        let directory = test_directory("found");
        std::fs::create_dir_all(&directory).expect("create test directory");
        let executable = directory.join("codex");
        std::fs::write(&executable, "placeholder").expect("write executable");

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut permissions = std::fs::metadata(&executable)
                .expect("metadata")
                .permissions();
            permissions.set_mode(0o755);
            std::fs::set_permissions(&executable, permissions).expect("make executable");
        }

        assert!(detect_in_paths("codex", std::slice::from_ref(&directory)));

        std::fs::remove_dir_all(&directory).expect("remove test directory");
    }

    #[test]
    fn reports_missing_when_no_executable_exists() {
        let directory = test_directory("missing");
        std::fs::create_dir_all(&directory).expect("create test directory");

        assert!(!detect_in_paths(
            "opencode",
            std::slice::from_ref(&directory)
        ));

        std::fs::remove_dir_all(&directory).expect("remove test directory");
    }

    #[test]
    fn detects_windows_command_extensions() {
        let names = candidate_names("codex");
        let names: Vec<String> = names
            .iter()
            .map(|name| name.to_string_lossy().into_owned())
            .collect();

        #[cfg(target_os = "windows")]
        {
            assert!(names.contains(&"codex.exe".to_owned()));
            assert!(names.contains(&"codex.cmd".to_owned()));
            assert!(names.contains(&"codex.bat".to_owned()));
        }
        assert!(names.contains(&"codex".to_owned()));
    }
}
