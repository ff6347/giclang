// ABOUTME: Verifies Windows credential storage against real temporary files and access-control lists.
// ABOUTME: Covers inherited permissions, replacement, provider-isolated sign-out, and insecure-file rejection.

use super::CredentialStore;
use std::{fs, path::Path};
use tempfile::TempDir;
use winapi::um::{
    accctrl::SE_FILE_OBJECT,
    winnt::{FILE_GENERIC_READ, FILE_GENERIC_WRITE},
};
use windows_acl::{
    acl::{AceType, ACL},
    helper::{current_user, name_to_sid, sid_to_string, string_to_sid},
};

fn allow_everyone(path: &Path, inheritable: bool) {
    let sid = string_to_sid("S-1-1-0").expect("resolve Everyone SID");
    ACL::from_path(&path.to_string_lossy(), SE_FILE_OBJECT, false)
        .expect("read fixture ACL")
        .allow(sid.as_ptr() as *mut _, inheritable, FILE_GENERIC_READ)
        .expect("allow Everyone to read the synthetic fixture");
}

fn inherited_directory() -> TempDir {
    let directory = TempDir::new().expect("create fixture directory");
    allow_everyone(directory.path(), true);
    directory
}

fn assert_private(path: &Path) {
    let user = current_user().expect("identify current user");
    let sid = name_to_sid(&user, None).expect("resolve current user SID");
    let expected = sid_to_string(sid.as_ptr() as *mut _).expect("format current user SID");
    let entries = ACL::from_path(&path.to_string_lossy(), SE_FILE_OBJECT, false)
        .expect("read credential ACL")
        .all()
        .expect("enumerate credential ACL");

    assert_eq!(entries.len(), 1, "credentials must have exactly one grant");
    assert_eq!(entries[0].entry_type, AceType::AccessAllow);
    assert_eq!(entries[0].string_sid, expected);
    assert_eq!(entries[0].mask, FILE_GENERIC_READ | FILE_GENERIC_WRITE);
    assert_eq!(
        entries[0].flags, 0,
        "credential grants must not be inherited"
    );
}

#[test]
fn creation_removes_inherited_access_and_survives_reopening() {
    let directory = inherited_directory();
    let path = directory.path().join("auth.json");
    let store = CredentialStore::new(path.clone());

    store
        .authenticate_opencode("synthetic-zen-key")
        .expect("create credential file");
    assert_private(&path);

    let reopened = CredentialStore::new(path);
    assert!(
        reopened
            .status()
            .expect("read reopened status")
            .opencode_authenticated
    );
    assert_eq!(
        reopened.with_opencode_key(str::to_owned).expect("read key"),
        "synthetic-zen-key"
    );
}

#[test]
fn replacement_and_provider_sign_out_preserve_private_permissions() {
    let directory = inherited_directory();
    let path = directory.path().join("auth.json");
    let store = CredentialStore::new(path.clone());
    store
        .authenticate_codex("synthetic-access", "synthetic-refresh", "synthetic-account")
        .expect("create Codex credentials");
    assert_private(&path);
    store
        .authenticate_opencode("synthetic-first-key")
        .expect("add Zen key");
    assert_private(&path);
    store
        .authenticate_opencode("synthetic-second-key")
        .expect("replace Zen key");
    assert_private(&path);
    assert!(!fs::read_to_string(&path)
        .expect("read replaced file")
        .contains("synthetic-first-key"));

    store.sign_out_codex().expect("sign out Codex");
    assert_private(&path);
    let status = store.status().expect("read remaining provider status");
    assert!(!status.codex_authenticated);
    assert!(status.opencode_authenticated);
    assert_eq!(
        store
            .with_opencode_key(str::to_owned)
            .expect("read remaining key"),
        "synthetic-second-key"
    );

    store.sign_out_opencode().expect("sign out final provider");
    assert!(!path.exists());
}

#[test]
fn rejects_another_principals_grant_without_rewriting_credentials() {
    let directory = inherited_directory();
    let path = directory.path().join("auth.json");
    let store = CredentialStore::new(path.clone());
    store
        .authenticate_opencode("synthetic-zen-key")
        .expect("create credentials");
    let contents = fs::read_to_string(&path).expect("read fixture contents");
    allow_everyone(&path, false);

    assert!(store.status().is_err());
    assert!(store
        .authenticate_opencode("synthetic-replacement-key")
        .is_err());
    assert!(store.sign_out_opencode().is_err());
    assert_eq!(
        fs::read_to_string(&path).expect("read rejected file"),
        contents
    );
}
