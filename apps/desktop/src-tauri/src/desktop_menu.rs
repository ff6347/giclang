// ABOUTME: Builds the native desktop File and Edit menus for the shared IDE.
// ABOUTME: Converts menu selections into typed actions delivered to the webview.

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    App, Emitter,
};

pub(crate) const MENU_ACTION_EVENT: &str = "desktop-menu-action";
const APPLICATION_SETTINGS_ID: &str = "application-settings";
const FILE_NEW_ID: &str = "file-new";
const FILE_OPEN_ID: &str = "file-open";
const FILE_REVEAL_ID: &str = "file-reveal";
const FILE_SAVE_ID: &str = "file-save";
const FILE_SAVE_AS_ID: &str = "file-save-as";
const EDIT_FORMAT_ID: &str = "edit-format";
const EDIT_UNDO_ID: &str = "edit-undo";
const EDIT_REDO_ID: &str = "edit-redo";
#[cfg(target_os = "macos")]
const REVEAL_LABEL: &str = "Reveal in Finder";
#[cfg(not(target_os = "macos"))]
const REVEAL_LABEL: &str = "Reveal in Explorer";
#[cfg(target_os = "macos")]
const REDO_ACCELERATOR: &str = "CmdOrCtrl+Shift+Z";
#[cfg(not(target_os = "macos"))]
const REDO_ACCELERATOR: &str = "CmdOrCtrl+Y";

fn action_for_menu_id(id: &str) -> Option<&'static str> {
    match id {
        FILE_NEW_ID => Some("new"),
        FILE_OPEN_ID => Some("open"),
        FILE_REVEAL_ID => Some("reveal"),
        FILE_SAVE_ID => Some("save"),
        FILE_SAVE_AS_ID => Some("saveAs"),
        EDIT_FORMAT_ID => Some("format"),
        EDIT_UNDO_ID => Some("undo"),
        EDIT_REDO_ID => Some("redo"),
        APPLICATION_SETTINGS_ID => Some("settings"),
        _ => None,
    }
}

pub(crate) fn install(app: &mut App) -> tauri::Result<()> {
    let new = MenuItemBuilder::with_id(FILE_NEW_ID, "New")
        .accelerator("CmdOrCtrl+N")
        .build(app)?;
    let open = MenuItemBuilder::with_id(FILE_OPEN_ID, "Open…")
        .accelerator("CmdOrCtrl+O")
        .build(app)?;
    let save = MenuItemBuilder::with_id(FILE_SAVE_ID, "Save")
        .accelerator("CmdOrCtrl+S")
        .build(app)?;
    let save_as = MenuItemBuilder::with_id(FILE_SAVE_AS_ID, "Save Sketch Folder As…")
        .accelerator("CmdOrCtrl+Shift+S")
        .build(app)?;
    let reveal = MenuItemBuilder::with_id(FILE_REVEAL_ID, REVEAL_LABEL)
        .accelerator("CmdOrCtrl+K")
        .build(app)?;
    let file = SubmenuBuilder::new(app, "File")
        .item(&new)
        .separator()
        .items(&[&open, &save, &save_as])
        .separator()
        .item(&reveal)
        .build()?;

    let undo = MenuItemBuilder::with_id(EDIT_UNDO_ID, "Undo")
        .accelerator("CmdOrCtrl+Z")
        .build(app)?;
    let redo = MenuItemBuilder::with_id(EDIT_REDO_ID, "Redo")
        .accelerator(REDO_ACCELERATOR)
        .build(app)?;
    let format = MenuItemBuilder::with_id(EDIT_FORMAT_ID, "Format Document")
        .accelerator("Alt+Shift+F")
        .build(app)?;
    let settings = MenuItemBuilder::with_id(APPLICATION_SETTINGS_ID, "Settings…")
        .accelerator("CmdOrCtrl+,")
        .build(app)?;
    let edit_builder = SubmenuBuilder::new(app, "Edit")
        .item(&undo)
        .item(&redo)
        .separator()
        .item(&format)
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all();
    #[cfg(not(target_os = "macos"))]
    let edit_builder = edit_builder.separator().item(&settings);
    let edit = edit_builder.build()?;

    #[cfg(target_os = "macos")]
    let application = SubmenuBuilder::new(app, "GiC")
        .about(None)
        .separator()
        .item(&settings)
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;
    let menu_builder = MenuBuilder::new(app);
    #[cfg(target_os = "macos")]
    let menu_builder = menu_builder.item(&application);
    let menu = menu_builder.items(&[&file, &edit]).build()?;
    app.set_menu(menu)?;
    app.on_menu_event(|app_handle, event| {
        if let Some(action) = action_for_menu_id(event.id().as_ref()) {
            let _ = app_handle.emit(MENU_ACTION_EVENT, action);
        }
    });
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::action_for_menu_id;

    #[test]
    fn maps_only_supported_native_menu_actions() {
        assert_eq!(action_for_menu_id("file-new"), Some("new"));
        assert_eq!(action_for_menu_id("file-open"), Some("open"));
        assert_eq!(action_for_menu_id("file-reveal"), Some("reveal"));
        assert_eq!(action_for_menu_id("file-save"), Some("save"));
        assert_eq!(action_for_menu_id("file-save-as"), Some("saveAs"));
        assert_eq!(action_for_menu_id("edit-format"), Some("format"));
        assert_eq!(action_for_menu_id("edit-undo"), Some("undo"));
        assert_eq!(action_for_menu_id("edit-redo"), Some("redo"));
        assert_eq!(action_for_menu_id("application-settings"), Some("settings"));
        assert_eq!(action_for_menu_id("unexpected"), None);
    }
}
