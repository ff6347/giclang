// ABOUTME: Stores provider authentication outside the webview and exposes only redacted status.
// ABOUTME: Uses atomic file replacement and owner-only access for the application credential file.

use serde::{Deserialize, Serialize};
use std::{fs, io::Write, path::PathBuf, sync::Mutex};
use tempfile::NamedTempFile;

#[derive(Default, Deserialize, Serialize)]
struct AuthFile {
    opencode_api_key: Option<String>,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CredentialStatus {
    pub opencode_authenticated: bool,
}

pub(crate) struct CredentialStore {
    access: Mutex<()>,
    path: PathBuf,
}

impl CredentialStore {
    pub(crate) fn new(path: PathBuf) -> Self {
        Self {
            access: Mutex::new(()),
            path,
        }
    }

    pub(crate) fn with_opencode_key<T>(
        &self,
        operation: impl FnOnce(&str) -> T,
    ) -> Result<T, String> {
        let _access = self
            .access
            .lock()
            .map_err(|_| "Provider credentials are unavailable.".to_owned())?;
        let auth = self
            .read_unlocked()
            .map_err(|_| "Provider credentials are unavailable.".to_owned())?;
        let api_key = auth
            .opencode_api_key
            .ok_or_else(|| "OpenCode is not authenticated.".to_owned())?;
        Ok(operation(&api_key))
    }

    pub(crate) fn status(&self) -> Result<CredentialStatus, String> {
        Ok(CredentialStatus {
            opencode_authenticated: self.read()?.opencode_api_key.is_some(),
        })
    }

    pub(crate) fn authenticate_opencode(&self, api_key: &str) -> Result<(), String> {
        if api_key.trim().is_empty() {
            return Err("Enter an OpenCode API key.".to_owned());
        }
        let _access = self
            .access
            .lock()
            .map_err(|_| "Provider credentials are unavailable.".to_owned())?;
        let mut auth = match self.read_unlocked() {
            Ok(auth) => auth,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => AuthFile::default(),
            Err(_) => return Err("Provider credentials are unavailable.".to_owned()),
        };
        auth.opencode_api_key = Some(api_key.to_owned());
        self.write_unlocked(&auth)
    }

    pub(crate) fn sign_out(&self) -> Result<(), String> {
        let _access = self
            .access
            .lock()
            .map_err(|_| "Provider credentials are unavailable.".to_owned())?;
        match fs::remove_file(&self.path) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(_) => Err("Unable to remove provider credentials.".to_owned()),
        }
    }

    fn read(&self) -> Result<AuthFile, String> {
        let _access = self
            .access
            .lock()
            .map_err(|_| "Provider credentials are unavailable.".to_owned())?;
        self.read_unlocked()
            .map_err(|_| "Provider credentials are unavailable.".to_owned())
    }

    fn read_unlocked(&self) -> Result<AuthFile, std::io::Error> {
        if !self.path.exists() {
            return Ok(AuthFile::default());
        }
        if !owner_only(&self.path)? {
            return Err(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "insecure provider credential file",
            ));
        }
        serde_json::from_str(&fs::read_to_string(&self.path)?).or_else(|_| Ok(AuthFile::default()))
    }

    fn write_unlocked(&self, auth: &AuthFile) -> Result<(), String> {
        let parent = self
            .path
            .parent()
            .ok_or_else(|| "Provider credential path has no parent.".to_owned())?;
        fs::create_dir_all(parent)
            .map_err(|_| "Unable to prepare provider credentials.".to_owned())?;
        let contents = serde_json::to_vec(auth)
            .map_err(|_| "Unable to serialize provider credentials.".to_owned())?;
        let mut temporary_file = NamedTempFile::new_in(parent)
            .map_err(|_| "Unable to prepare provider credentials.".to_owned())?;
        temporary_file
            .write_all(&contents)
            .and_then(|()| temporary_file.as_file().sync_all())
            .map_err(|_| "Unable to write provider credentials.".to_owned())?;
        set_owner_only(temporary_file.path())
            .map_err(|_| "Unable to protect provider credentials.".to_owned())?;
        temporary_file
            .persist(&self.path)
            .map_err(|_| "Unable to replace provider credentials.".to_owned())?;
        set_owner_only(&self.path).map_err(|_| "Unable to protect provider credentials.".to_owned())
    }
}

#[cfg(unix)]
fn owner_only(path: &std::path::Path) -> Result<bool, std::io::Error> {
    use std::os::unix::fs::PermissionsExt;
    Ok(fs::metadata(path)?.permissions().mode() & 0o077 == 0)
}

#[cfg(windows)]
fn owner_only(path: &std::path::Path) -> Result<bool, std::io::Error> {
    use winapi::um::accctrl::SE_FILE_OBJECT;
    use windows_acl::{
        acl::{AceType, ACL},
        helper::{current_user, name_to_sid, sid_to_string},
    };

    let user =
        current_user().ok_or_else(|| std::io::Error::other("unable to identify current user"))?;
    let sid = name_to_sid(&user, None)
        .map_err(|_| std::io::Error::other("unable to identify current user"))?;
    let expected = sid_to_string(sid.as_ptr() as *mut _)
        .map_err(|_| std::io::Error::other("unable to identify current user"))?;
    let acl = ACL::from_path(&path.to_string_lossy(), SE_FILE_OBJECT, false)
        .map_err(|_| std::io::Error::other("unable to read credential permissions"))?;
    let entries = acl
        .all()
        .map_err(|_| std::io::Error::other("unable to read credential permissions"))?;
    let has_owner_allow = entries
        .iter()
        .any(|entry| entry.entry_type == AceType::AccessAllow && entry.string_sid == expected);
    let has_other_allow = entries
        .iter()
        .any(|entry| entry.entry_type == AceType::AccessAllow && entry.string_sid != expected);
    Ok(has_owner_allow && !has_other_allow)
}

#[cfg(unix)]
fn set_owner_only(path: &std::path::Path) -> Result<(), std::io::Error> {
    use std::os::unix::fs::PermissionsExt;
    fs::set_permissions(path, fs::Permissions::from_mode(0o600))
}

#[cfg(windows)]
fn set_owner_only(path: &std::path::Path) -> Result<(), std::io::Error> {
    use winapi::{
        um::accctrl::SE_FILE_OBJECT,
        um::winnt::{FILE_GENERIC_READ, FILE_GENERIC_WRITE},
    };
    use windows_acl::{
        acl::{AceType, ACL},
        helper::{current_user, name_to_sid},
    };

    let user =
        current_user().ok_or_else(|| std::io::Error::other("unable to identify current user"))?;
    let sid = name_to_sid(&user, None)
        .map_err(|_| std::io::Error::other("unable to identify current user"))?;
    let mut acl = ACL::from_path(&path.to_string_lossy(), SE_FILE_OBJECT, false)
        .map_err(|_| std::io::Error::other("unable to protect credential permissions"))?;
    let entries = acl
        .all()
        .map_err(|_| std::io::Error::other("unable to protect credential permissions"))?;
    let existing_sids: Vec<Vec<u16>> = entries
        .iter()
        .filter(|entry| entry.entry_type == AceType::AccessAllow)
        .filter_map(|entry| entry.sid.clone())
        .collect();
    for existing_sid in existing_sids {
        acl.remove(
            existing_sid.as_ptr() as *mut _,
            Some(AceType::AccessAllow),
            None,
        )
        .map_err(|_| std::io::Error::other("unable to protect credential permissions"))?;
    }
    acl.allow(
        sid.as_ptr() as *mut _,
        false,
        FILE_GENERIC_READ | FILE_GENERIC_WRITE,
    )
    .map_err(|_| std::io::Error::other("unable to protect credential permissions"))?;
    Ok(())
}
