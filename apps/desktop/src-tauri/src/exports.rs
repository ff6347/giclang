// ABOUTME: Saves user-requested sketch exports through the desktop file boundary.
// ABOUTME: Restricts output formats and writes only to a selected destination.

use std::{fs, path::Path};
use tauri::ipc::InvokeBody;

pub(crate) const MAX_EXPORT_BYTES: usize = 8 * 1024 * 1024;

#[derive(Clone, Copy, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum ExportFormat {
    Png,
    Html,
}

impl ExportFormat {
    pub(crate) fn extension(self) -> &'static str {
        match self {
            Self::Png => "png",
            Self::Html => "html",
        }
    }

    pub(crate) fn filter(self) -> &'static str {
        match self {
            Self::Png => "PNG image",
            Self::Html => "Standalone HTML",
        }
    }

    pub(crate) fn title(self) -> &'static str {
        match self {
            Self::Png => "Export PNG",
            Self::Html => "Export Standalone HTML",
        }
    }

    pub(crate) fn file_name(self) -> &'static str {
        match self {
            Self::Png => "gic-sketch.png",
            Self::Html => "gic-sketch.html",
        }
    }
}

pub(crate) fn validate_export_contents(contents: &[u8]) -> Result<(), String> {
    if contents.is_empty() {
        return Err("Export is empty.".to_owned());
    }
    if contents.len() > MAX_EXPORT_BYTES {
        return Err("Export exceeds 8 MiB.".to_owned());
    }
    Ok(())
}

pub(crate) fn export_contents(body: &InvokeBody) -> Result<Vec<u8>, String> {
    let InvokeBody::Raw(contents) = body else {
        return Err("Export requires binary data.".to_owned());
    };
    validate_export_contents(contents)?;
    Ok(contents.clone())
}

pub(crate) fn save_export_bytes(
    selected: &Path,
    format: ExportFormat,
    contents: &[u8],
) -> Result<(), String> {
    validate_export_contents(contents)?;
    fs::write(selected.with_extension(format.extension()), contents)
        .map_err(|_| "Unable to save export.".to_owned())
}

#[cfg(test)]
mod tests {
    use super::{export_contents, save_export_bytes, ExportFormat, MAX_EXPORT_BYTES};
    use std::fs;
    use tauri::ipc::InvokeBody;
    use tempfile::tempdir;

    #[test]
    fn png_export_writes_exact_bytes_with_png_extension() {
        let directory = tempdir().expect("create export directory");
        let selected = directory.path().join("sketch.txt");
        let bytes = [137, 80, 78, 71, 13, 10, 26, 10];

        save_export_bytes(&selected, ExportFormat::Png, &bytes).expect("save PNG");

        assert_eq!(
            fs::read(directory.path().join("sketch.png")).expect("read PNG"),
            bytes
        );
        assert!(!selected.exists());
    }

    #[test]
    fn html_export_writes_utf8_with_html_extension() {
        let directory = tempdir().expect("create export directory");
        let selected = directory.path().join("sketch.gic");
        let html = "<!doctype html><title>GIC</title>";

        save_export_bytes(&selected, ExportFormat::Html, html.as_bytes()).expect("save HTML");

        assert_eq!(
            fs::read_to_string(directory.path().join("sketch.html")).expect("read HTML"),
            html
        );
        assert!(!selected.exists());
    }

    #[test]
    fn export_rejects_empty_and_oversized_contents_without_writing() {
        let directory = tempdir().expect("create export directory");
        let selected = directory.path().join("sketch.png");

        assert_eq!(
            save_export_bytes(&selected, ExportFormat::Png, &[]),
            Err("Export is empty.".to_owned())
        );
        assert_eq!(
            save_export_bytes(&selected, ExportFormat::Png, &vec![0; MAX_EXPORT_BYTES + 1]),
            Err("Export exceeds 8 MiB.".to_owned())
        );
        assert!(!selected.exists());
    }

    #[test]
    fn export_rejects_unsupported_formats_and_reports_write_failures() {
        assert!(serde_json::from_str::<ExportFormat>(r#""svg""#).is_err());
        let directory = tempdir().expect("create export directory");
        let selected = directory.path().join("missing/sketch.png");

        assert_eq!(
            save_export_bytes(&selected, ExportFormat::Png, &[1]),
            Err("Unable to save export.".to_owned())
        );
    }

    #[test]
    fn export_accepts_bounded_binary_ipc_and_rejects_json() {
        assert_eq!(
            export_contents(&InvokeBody::Raw(vec![1, 2, 3])),
            Ok(vec![1, 2, 3])
        );
        assert_eq!(
            export_contents(&InvokeBody::Json(serde_json::json!([1, 2, 3]))),
            Err("Export requires binary data.".to_owned())
        );
        assert_eq!(
            export_contents(&InvokeBody::Raw(vec![0; MAX_EXPORT_BYTES + 1])),
            Err("Export exceeds 8 MiB.".to_owned())
        );
    }
}
