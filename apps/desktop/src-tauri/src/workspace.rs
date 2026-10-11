// ABOUTME: Provisions and repairs the Processing-style GIC workspace and its managed support files.
// ABOUTME: Tracks installed content by digest so updates never overwrite user changes.

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fmt::Write as _,
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tempfile::NamedTempFile;

const MANIFEST_VERSION: u32 = 1;
const SKETCHES_DIR: &str = "sketches";

#[derive(Clone, Copy, Debug)]
pub(crate) struct ManagedFile {
    pub(crate) relative_path: &'static str,
    pub(crate) contents: &'static [u8],
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Resolution {
    Keep,
    Replace,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum FileState {
    Missing,
    UpToDate,
    Modified,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ManagedFileReport {
    pub(crate) path: String,
    pub(crate) resolved_path: String,
    pub(crate) state: FileState,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WorkspaceStatus {
    pub(crate) installed: bool,
    pub(crate) directory: String,
    pub(crate) files: Vec<ManagedFileReport>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FileRecord {
    digest: String,
    #[serde(default)]
    kept: bool,
}

impl FileRecord {
    fn managed(digest: String) -> Self {
        Self {
            digest,
            kept: false,
        }
    }

    fn kept(digest: String) -> Self {
        Self { digest, kept: true }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Manifest {
    version: u32,
    #[serde(default = "enabled_by_default")]
    enabled: bool,
    files: BTreeMap<String, FileRecord>,
}

fn enabled_by_default() -> bool {
    true
}

impl Manifest {
    fn new() -> Self {
        Self {
            version: MANIFEST_VERSION,
            enabled: true,
            files: BTreeMap::new(),
        }
    }
}

pub(crate) struct WorkspaceManager {
    access: Mutex<()>,
    created_notice: Mutex<Option<String>>,
    workspace_root: Mutex<PathBuf>,
    manifest_path: PathBuf,
}

impl WorkspaceManager {
    pub(crate) fn new(workspace_root: PathBuf, manifest_path: PathBuf) -> Self {
        Self {
            access: Mutex::new(()),
            created_notice: Mutex::new(None),
            workspace_root: Mutex::new(workspace_root),
            manifest_path,
        }
    }

    pub(crate) fn workspace_root(&self) -> PathBuf {
        self.workspace_root
            .lock()
            .map(|root| root.clone())
            .unwrap_or_else(|poisoned| poisoned.into_inner().clone())
    }

    pub(crate) fn set_root(&self, root: PathBuf) -> Result<(), String> {
        let _access = self
            .access
            .lock()
            .map_err(|_| "Workspace support is unavailable.".to_owned())?;
        *self
            .workspace_root
            .lock()
            .map_err(|_| "Workspace support is unavailable.".to_owned())? = root;
        Ok(())
    }

    pub(crate) fn record_creation_notice(&self, path: PathBuf) {
        if let Ok(mut notice) = self.created_notice.lock() {
            *notice = Some(path.display().to_string());
        }
    }

    pub(crate) fn take_creation_notice(&self) -> Option<String> {
        self.created_notice
            .lock()
            .ok()
            .and_then(|mut notice| notice.take())
    }

    pub(crate) fn status(&self, managed: &[ManagedFile]) -> Result<WorkspaceStatus, String> {
        let _access = self
            .access
            .lock()
            .map_err(|_| "Workspace support is unavailable.".to_owned())?;
        let workspace_root = self.root_locked()?;
        self.status_locked(&workspace_root, managed)
    }

    pub(crate) fn reconcile(&self, managed: &[ManagedFile]) -> Result<WorkspaceStatus, String> {
        let _access = self
            .access
            .lock()
            .map_err(|_| "Workspace support is unavailable.".to_owned())?;
        let workspace_root = self.root_locked()?;
        let mut manifest = self.read_manifest();
        manifest.enabled = true;
        self.ensure_structure(&workspace_root)?;
        for file in managed {
            let target = workspace_root.join(file.relative_path);
            let bundled = digest(file.contents);
            if !target.exists() {
                install(&target, file.contents)?;
                manifest
                    .files
                    .insert(file.relative_path.to_owned(), FileRecord::managed(bundled));
                continue;
            }
            let on_disk = read_digest(&target);
            let replace = match manifest.files.get(file.relative_path) {
                None => None,
                Some(record) if record.kept => None,
                Some(record)
                    if on_disk.as_deref() == Some(record.digest.as_str())
                        && record.digest != bundled =>
                {
                    Some(bundled)
                }
                Some(_) => None,
            };
            if let Some(replacement) = replace {
                install(&target, file.contents)?;
                manifest.files.insert(
                    file.relative_path.to_owned(),
                    FileRecord::managed(replacement),
                );
            }
        }
        self.write_manifest(&manifest)?;
        self.status_locked(&workspace_root, managed)
    }

    pub(crate) fn resolve(
        &self,
        relative_path: &str,
        resolution: Resolution,
        managed: &[ManagedFile],
    ) -> Result<WorkspaceStatus, String> {
        let _access = self
            .access
            .lock()
            .map_err(|_| "Workspace support is unavailable.".to_owned())?;
        let workspace_root = self.root_locked()?;
        let file = managed
            .iter()
            .find(|file| file.relative_path == relative_path)
            .ok_or_else(|| "Unknown managed file.".to_owned())?;
        let target = workspace_root.join(relative_path);
        if !target.exists() {
            return Err("Managed file is missing.".to_owned());
        }
        let mut manifest = self.read_manifest();
        match resolution {
            Resolution::Keep => {
                let on_disk = read_digest(&target)
                    .ok_or_else(|| "Unable to read the managed file.".to_owned())?;
                manifest
                    .files
                    .insert(relative_path.to_owned(), FileRecord::kept(on_disk));
            }
            Resolution::Replace => {
                let backup = backup_path(&target);
                fs::copy(&target, &backup)
                    .map_err(|_| "Unable to back up the modified file.".to_owned())?;
                install(&target, file.contents)?;
                manifest.files.insert(
                    relative_path.to_owned(),
                    FileRecord::managed(digest(file.contents)),
                );
            }
        }
        self.write_manifest(&manifest)?;
        self.status_locked(&workspace_root, managed)
    }

    pub(crate) fn uninstall(&self, managed: &[ManagedFile]) -> Result<WorkspaceStatus, String> {
        let _access = self
            .access
            .lock()
            .map_err(|_| "Workspace support is unavailable.".to_owned())?;
        let workspace_root = self.root_locked()?;
        let mut manifest = self.read_manifest();
        manifest.enabled = false;
        for file in managed {
            let target = workspace_root.join(file.relative_path);
            if !target.exists() {
                manifest.files.remove(file.relative_path);
                continue;
            }
            let remove = manifest
                .files
                .get(file.relative_path)
                .is_some_and(|record| {
                    !record.kept && read_digest(&target).as_deref() == Some(record.digest.as_str())
                });
            if remove {
                fs::remove_file(&target)
                    .map_err(|_| "Unable to remove a managed support file.".to_owned())?;
                manifest.files.remove(file.relative_path);
            }
        }
        self.prune_managed_dirs(&workspace_root, managed);
        self.write_manifest(&manifest)?;
        self.status_locked(&workspace_root, managed)
    }

    fn root_locked(&self) -> Result<PathBuf, String> {
        self.workspace_root
            .lock()
            .map(|root| root.clone())
            .map_err(|_| "Workspace support is unavailable.".to_owned())
    }

    fn status_locked(
        &self,
        workspace_root: &Path,
        managed: &[ManagedFile],
    ) -> Result<WorkspaceStatus, String> {
        let manifest = self.read_manifest();
        let installed = self.manifest_path.exists() && manifest.enabled;
        let mut files = Vec::with_capacity(managed.len());
        for file in managed {
            let target = workspace_root.join(file.relative_path);
            let state = if !target.exists() {
                FileState::Missing
            } else if manifest
                .files
                .get(file.relative_path)
                .is_some_and(|record| {
                    read_digest(&target).as_deref() == Some(record.digest.as_str())
                })
            {
                FileState::UpToDate
            } else {
                FileState::Modified
            };
            files.push(ManagedFileReport {
                path: file.relative_path.to_owned(),
                resolved_path: target.display().to_string(),
                state,
            });
        }
        Ok(WorkspaceStatus {
            installed,
            directory: workspace_root.display().to_string(),
            files,
        })
    }

    fn ensure_structure(&self, workspace_root: &Path) -> Result<(), String> {
        fs::create_dir_all(workspace_root)
            .map_err(|_| "Unable to create the workspace.".to_owned())?;
        fs::create_dir_all(workspace_root.join(SKETCHES_DIR))
            .map_err(|_| "Unable to create the sketches folder.".to_owned())?;
        Ok(())
    }

    fn prune_managed_dirs(&self, workspace_root: &Path, managed: &[ManagedFile]) {
        let mut dirs: Vec<PathBuf> = Vec::new();
        for file in managed {
            let mut current = workspace_root.join(file.relative_path);
            current.pop();
            while current.starts_with(workspace_root) && current.as_path() != workspace_root {
                dirs.push(current.clone());
                current.pop();
            }
        }
        dirs.sort_by_key(|dir| std::cmp::Reverse(dir.components().count()));
        dirs.dedup();
        for dir in dirs {
            let _ = fs::remove_dir(&dir);
        }
    }

    fn read_manifest(&self) -> Manifest {
        let Ok(contents) = fs::read_to_string(&self.manifest_path) else {
            return Manifest::new();
        };
        serde_json::from_str::<Manifest>(&contents)
            .ok()
            .filter(|manifest| manifest.version == MANIFEST_VERSION)
            .unwrap_or_else(Manifest::new)
    }

    fn write_manifest(&self, manifest: &Manifest) -> Result<(), String> {
        let parent = self
            .manifest_path
            .parent()
            .ok_or_else(|| "Workspace state path has no parent.".to_owned())?;
        fs::create_dir_all(parent).map_err(|_| "Unable to prepare workspace state.".to_owned())?;
        let contents = serde_json::to_vec(manifest)
            .map_err(|_| "Unable to serialize workspace state.".to_owned())?;
        let mut temporary_file = NamedTempFile::new_in(parent)
            .map_err(|_| "Unable to prepare workspace state.".to_owned())?;
        temporary_file
            .write_all(&contents)
            .and_then(|()| temporary_file.as_file().sync_all())
            .map_err(|_| "Unable to write workspace state.".to_owned())?;
        temporary_file
            .persist(&self.manifest_path)
            .map_err(|_| "Unable to replace workspace state.".to_owned())?;
        Ok(())
    }
}

fn digest(contents: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(contents);
    let bytes = hasher.finalize();
    let mut encoded = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        let _ = write!(encoded, "{byte:02x}");
    }
    encoded
}

fn read_digest(path: &Path) -> Option<String> {
    let contents = fs::read(path).ok()?;
    Some(digest(&contents))
}

fn backup_path(path: &Path) -> PathBuf {
    let name = path
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_else(|| "file".to_owned());
    path.with_file_name(format!("{name}.user-bak"))
}

fn install(path: &Path, contents: &[u8]) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Managed file path has no parent.".to_owned())?;
    fs::create_dir_all(parent)
        .map_err(|_| "Unable to prepare managed file directory.".to_owned())?;
    let mut temporary_file =
        NamedTempFile::new_in(parent).map_err(|_| "Unable to prepare managed file.".to_owned())?;
    temporary_file
        .write_all(contents)
        .and_then(|()| temporary_file.as_file().sync_all())
        .map_err(|_| "Unable to write managed file.".to_owned())?;
    temporary_file
        .persist(path)
        .map_err(|_| "Unable to replace managed file.".to_owned())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{FileState, ManagedFile, Resolution, WorkspaceManager, WorkspaceStatus};
    use std::path::{Path, PathBuf};

    const AGENTS: &str = "AGENTS.md";
    const SKILL: &str = ".agents/skills/gic-agent/SKILL.md";
    const REFERENCE: &str = ".agents/skills/gic-agent/references/language.md";

    fn files(
        first: &'static [u8],
        skill: &'static [u8],
        reference: &'static [u8],
    ) -> Vec<ManagedFile> {
        vec![
            ManagedFile {
                relative_path: AGENTS,
                contents: first,
            },
            ManagedFile {
                relative_path: SKILL,
                contents: skill,
            },
            ManagedFile {
                relative_path: REFERENCE,
                contents: reference,
            },
        ]
    }

    fn v1() -> Vec<ManagedFile> {
        files(b"# GIC workspace\n", b"tutor v1\n", b"reference v1\n")
    }

    fn v2() -> Vec<ManagedFile> {
        files(b"# GIC workspace v2\n", b"tutor v2\n", b"reference v2\n")
    }

    fn test_directory(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "gic-desktop-workspace-{}-{name}",
            std::process::id(),
        ))
    }

    fn manager(name: &str) -> (WorkspaceManager, PathBuf) {
        let directory = test_directory(name);
        remove_test_directory(&directory);
        std::fs::create_dir_all(&directory).expect("create test directory");
        let manager = WorkspaceManager::new(
            directory.join("workspace"),
            directory.join("state/managed-workspace.json"),
        );
        (manager, directory)
    }

    fn remove_test_directory(path: &Path) {
        if path.exists() {
            std::fs::remove_dir_all(path).expect("remove test directory");
        }
    }

    fn state_for(status: &WorkspaceStatus, path: &str) -> FileState {
        status
            .files
            .iter()
            .find(|report| report.path == path)
            .unwrap_or_else(|| panic!("missing report for {path}"))
            .state
    }

    #[test]
    fn first_run_installs_structure_files_and_manifest() {
        let (workspace, directory) = manager("first-run");
        let status = workspace.reconcile(&v1()).expect("reconcile");

        assert!(workspace.workspace_root().join("sketches").is_dir());
        assert!(workspace.workspace_root().join("sketches").is_dir());
        assert!(workspace.workspace_root().join(AGENTS).is_file());
        assert!(workspace.workspace_root().join(SKILL).is_file());
        assert!(workspace.workspace_root().join(REFERENCE).is_file());
        assert_eq!(
            std::fs::read_to_string(workspace.workspace_root().join(AGENTS)).expect("read AGENTS"),
            "# GIC workspace\n",
        );
        assert!(directory.join("state/managed-workspace.json").is_file());
        assert!(status.installed);
        assert_eq!(
            status.directory,
            workspace.workspace_root().display().to_string()
        );
        assert!(status.files.iter().all(|report| {
            report.state == FileState::UpToDate
                && report.resolved_path
                    == workspace
                        .workspace_root()
                        .join(&report.path)
                        .display()
                        .to_string()
        }));
        remove_test_directory(&directory);
    }

    #[test]
    fn fresh_workspace_reports_not_installed_and_missing_files() {
        let (workspace, directory) = manager("fresh-status");
        let status = workspace.status(&v1()).expect("status");

        assert!(!status.installed);
        assert_eq!(
            status.directory,
            workspace.workspace_root().display().to_string()
        );
        assert!(status.files.iter().all(|report| {
            report.state == FileState::Missing
                && report.resolved_path
                    == workspace
                        .workspace_root()
                        .join(&report.path)
                        .display()
                        .to_string()
        }));
        assert!(!workspace.workspace_root().exists());
        remove_test_directory(&directory);
    }

    #[test]
    fn status_paths_follow_the_configured_workspace_root() {
        let (workspace, directory) = manager("relocated-status");
        workspace.reconcile(&v1()).expect("install");
        let relocated_root = directory.join("relocated");
        workspace
            .set_root(relocated_root.clone())
            .expect("relocate workspace");

        let status = workspace.status(&v1()).expect("status");

        assert_eq!(status.directory, relocated_root.display().to_string());
        assert_eq!(status.files.len(), v1().len());
        for report in &status.files {
            assert_eq!(
                report.resolved_path,
                relocated_root.join(&report.path).display().to_string(),
            );
            assert!(v1().iter().any(|file| file.relative_path == report.path));
        }
        remove_test_directory(&directory);
    }

    #[test]
    fn reconcile_is_idempotent() {
        let (workspace, directory) = manager("idempotent");
        let first = workspace.reconcile(&v1()).expect("first reconcile");
        let before = std::fs::read(workspace.workspace_root().join(SKILL)).expect("read SKILL");
        let second = workspace.reconcile(&v1()).expect("second reconcile");

        assert_eq!(
            std::fs::read(workspace.workspace_root().join(SKILL)).expect("read SKILL again"),
            before,
        );
        assert_eq!(first, second);
        remove_test_directory(&directory);
    }

    #[test]
    fn update_replaces_unmodified_files() {
        let (workspace, directory) = manager("update-unmodified");
        workspace.reconcile(&v1()).expect("install v1");
        let status = workspace.reconcile(&v2()).expect("update to v2");

        assert_eq!(
            std::fs::read_to_string(workspace.workspace_root().join(AGENTS)).expect("read AGENTS"),
            "# GIC workspace v2\n",
        );
        assert!(status
            .files
            .iter()
            .all(|report| report.state == FileState::UpToDate));
        remove_test_directory(&directory);
    }

    #[test]
    fn modified_file_is_preserved_and_flagged() {
        let (workspace, directory) = manager("modified-preserved");
        workspace.reconcile(&v1()).expect("install v1");
        std::fs::write(workspace.workspace_root().join(AGENTS), "my own guidance\n")
            .expect("edit AGENTS");

        let status = workspace.reconcile(&v2()).expect("update to v2");

        assert_eq!(
            std::fs::read_to_string(workspace.workspace_root().join(AGENTS)).expect("read AGENTS"),
            "my own guidance\n",
        );
        assert_eq!(
            std::fs::read_to_string(workspace.workspace_root().join(SKILL)).expect("read SKILL"),
            "tutor v2\n",
        );
        assert_eq!(state_for(&status, AGENTS), FileState::Modified);
        assert_eq!(state_for(&status, SKILL), FileState::UpToDate);
        remove_test_directory(&directory);
    }

    #[test]
    fn keep_my_version_adopts_current_content() {
        let (workspace, directory) = manager("keep-version");
        workspace.reconcile(&v1()).expect("install v1");
        std::fs::write(workspace.workspace_root().join(AGENTS), "my own guidance\n")
            .expect("edit AGENTS");

        let status = workspace
            .resolve(AGENTS, Resolution::Keep, &v1())
            .expect("keep version");

        assert_eq!(
            std::fs::read_to_string(workspace.workspace_root().join(AGENTS)).expect("read AGENTS"),
            "my own guidance\n",
        );
        assert_eq!(state_for(&status, AGENTS), FileState::UpToDate);
        assert!(workspace
            .read_manifest()
            .files
            .get(AGENTS)
            .is_some_and(|record| record.kept));

        let later = workspace.reconcile(&v2()).expect("later update");
        assert_eq!(
            std::fs::read_to_string(workspace.workspace_root().join(AGENTS)).expect("read AGENTS"),
            "my own guidance\n",
        );
        assert_eq!(state_for(&later, AGENTS), FileState::UpToDate);
        assert!(workspace
            .read_manifest()
            .files
            .get(AGENTS)
            .is_some_and(|record| record.kept));
        remove_test_directory(&directory);
    }

    #[test]
    fn reconcile_preserves_unrelated_manifest_records() {
        let (workspace, directory) = manager("unrelated-manifest-record");
        let manifest_path = directory.join("state/managed-workspace.json");
        std::fs::create_dir_all(manifest_path.parent().expect("manifest parent"))
            .expect("create manifest directory");
        std::fs::write(
            &manifest_path,
            r#"{"version":1,"enabled":true,"files":{"unrelated/file.md":{"digest":"user-record","kept":true}}}"#,
        )
        .expect("write manifest with unrelated record");

        workspace.reconcile(&v1()).expect("reconcile");
        workspace.uninstall(&v1()).expect("uninstall");

        let manifest = workspace.read_manifest();
        assert!(manifest.files.contains_key("unrelated/file.md"));
        assert_eq!(manifest.files["unrelated/file.md"].digest, "user-record");
        assert!(manifest.files["unrelated/file.md"].kept);
        remove_test_directory(&directory);
    }

    #[test]
    fn replace_backs_up_and_installs_bundled_version() {
        let (workspace, directory) = manager("replace-version");
        workspace.reconcile(&v1()).expect("install v1");
        std::fs::write(workspace.workspace_root().join(AGENTS), "my own guidance\n")
            .expect("edit AGENTS");

        let status = workspace
            .resolve(AGENTS, Resolution::Replace, &v1())
            .expect("replace version");

        assert_eq!(
            std::fs::read_to_string(workspace.workspace_root().join(AGENTS)).expect("read AGENTS"),
            "# GIC workspace\n",
        );
        assert_eq!(
            std::fs::read_to_string(workspace.workspace_root().join("AGENTS.md.user-bak"))
                .expect("read backup"),
            "my own guidance\n",
        );
        assert_eq!(state_for(&status, AGENTS), FileState::UpToDate);
        remove_test_directory(&directory);
    }

    #[test]
    fn uninstall_removes_unmodified_keeps_modified_and_disables() {
        let (workspace, directory) = manager("uninstall");
        workspace.reconcile(&v1()).expect("install");
        std::fs::write(workspace.workspace_root().join(SKILL), "my tutor rules\n")
            .expect("edit SKILL");

        let status = workspace.uninstall(&v1()).expect("uninstall");

        assert!(!workspace.workspace_root().join(AGENTS).exists());
        assert!(!workspace.workspace_root().join(REFERENCE).exists());
        assert_eq!(
            std::fs::read_to_string(workspace.workspace_root().join(SKILL)).expect("read SKILL"),
            "my tutor rules\n",
        );
        assert!(workspace.workspace_root().join("sketches").is_dir());
        assert!(!workspace.workspace_root().join("sessions").exists());
        assert!(!status.installed);
        remove_test_directory(&directory);
    }

    #[test]
    fn uninstall_prunes_empty_managed_directories() {
        let (workspace, directory) = manager("uninstall-prune");
        workspace.reconcile(&v1()).expect("install");

        workspace.uninstall(&v1()).expect("uninstall");

        assert!(!workspace.workspace_root().join(".agents").exists());
        assert!(workspace.workspace_root().is_dir());
        remove_test_directory(&directory);
    }

    #[test]
    fn reinstall_restores_missing_and_preserves_modified() {
        let (workspace, directory) = manager("reinstall");
        workspace.reconcile(&v1()).expect("install");
        std::fs::write(workspace.workspace_root().join(AGENTS), "my own guidance\n")
            .expect("edit AGENTS");
        workspace.uninstall(&v1()).expect("uninstall");

        let status = workspace.reconcile(&v1()).expect("reinstall");

        assert!(status.installed);
        assert_eq!(
            std::fs::read_to_string(workspace.workspace_root().join(SKILL)).expect("read SKILL"),
            "tutor v1\n",
        );
        assert_eq!(
            std::fs::read_to_string(workspace.workspace_root().join(AGENTS)).expect("read AGENTS"),
            "my own guidance\n",
        );
        assert_eq!(state_for(&status, AGENTS), FileState::Modified);
        assert_eq!(state_for(&status, SKILL), FileState::UpToDate);
        remove_test_directory(&directory);
    }

    #[test]
    fn pre_existing_file_without_record_is_preserved() {
        let (workspace, directory) = manager("pre-existing");
        std::fs::create_dir_all(workspace.workspace_root()).expect("create workspace root");
        std::fs::write(
            workspace.workspace_root().join(AGENTS),
            "existing local file\n",
        )
        .expect("write pre-existing AGENTS");

        let status = workspace.reconcile(&v1()).expect("reconcile");

        assert_eq!(
            std::fs::read_to_string(workspace.workspace_root().join(AGENTS)).expect("read AGENTS"),
            "existing local file\n",
        );
        assert_eq!(state_for(&status, AGENTS), FileState::Modified);
        assert_eq!(
            std::fs::read_to_string(workspace.workspace_root().join(SKILL)).expect("read SKILL"),
            "tutor v1\n",
        );
        remove_test_directory(&directory);
    }

    #[test]
    fn resolve_unknown_file_is_rejected() {
        let (workspace, directory) = manager("resolve-unknown");
        workspace.reconcile(&v1()).expect("install");

        assert_eq!(
            workspace.resolve("missing.md", Resolution::Keep, &v1()),
            Err("Unknown managed file.".to_owned()),
        );
        remove_test_directory(&directory);
    }

    #[test]
    fn detects_missing_files_in_status() {
        let (workspace, directory) = manager("missing-status");
        workspace.reconcile(&v1()).expect("install");
        std::fs::remove_file(workspace.workspace_root().join(REFERENCE)).expect("delete reference");

        let status = workspace.status(&v1()).expect("status");

        assert_eq!(state_for(&status, REFERENCE), FileState::Missing);
        remove_test_directory(&directory);
    }

    #[test]
    fn records_a_creation_notice_until_consumed() {
        let (workspace, directory) = manager("creation-notice");
        workspace.record_creation_notice(workspace.workspace_root());

        assert_eq!(
            workspace.take_creation_notice(),
            Some(workspace.workspace_root().display().to_string()),
        );
        assert_eq!(workspace.take_creation_notice(), None);
        remove_test_directory(&directory);
    }
}
