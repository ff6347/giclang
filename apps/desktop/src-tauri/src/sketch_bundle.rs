// ABOUTME: Validates and transactionally replaces native sketch bundle files.
// ABOUTME: Preserves originals when source, description, or thumbnail writes fail.

use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};
use tempfile::NamedTempFile;

pub(crate) fn validate_thumbnail(bytes: &[u8]) -> Result<(), String> {
    let decoder = png::Decoder::new(std::io::Cursor::new(bytes));
    let mut reader = decoder
        .read_info()
        .map_err(|_| "The captured sketch thumbnail is not a valid PNG.".to_owned())?;
    if reader.info().width != 100 || reader.info().height != 100 {
        return Err("The captured sketch thumbnail must be 100 × 100 pixels.".to_owned());
    }
    let buffer_size = reader
        .output_buffer_size()
        .ok_or_else(|| "The captured sketch thumbnail is too large.".to_owned())?;
    let mut pixels = vec![0; buffer_size];
    reader
        .next_frame(&mut pixels)
        .map_err(|_| "The captured sketch thumbnail is not a valid PNG.".to_owned())?;
    Ok(())
}

pub(crate) fn stage_bytes(
    parent: &Path,
    contents: &[u8],
    message: &str,
) -> Result<NamedTempFile, String> {
    let mut file = NamedTempFile::new_in(parent).map_err(|_| message.to_owned())?;
    file.write_all(contents)
        .and_then(|()| file.as_file().sync_all())
        .map_err(|_| message.to_owned())?;
    Ok(file)
}

pub(crate) fn replace_sketch_files(
    source_path: &Path,
    source_stage: NamedTempFile,
    description_path: &Path,
    description_stage: Option<NamedTempFile>,
    thumbnail_path: &Path,
    thumbnail_stage: Option<NamedTempFile>,
) -> Result<(), String> {
    let mut files = vec![
        (
            source_path,
            Some(source_stage),
            "Unable to replace the sketch file.",
        ),
        (
            description_path,
            description_stage,
            "Unable to write the sketch description.",
        ),
    ];
    if thumbnail_stage.is_some() {
        files.push((
            thumbnail_path,
            thumbnail_stage,
            "Unable to write the sketch thumbnail.",
        ));
    }
    let targets: Vec<&Path> = files.iter().map(|(path, _, _)| *path).collect();
    let backups = move_file_backups(&files)?;
    if let Err(error) = install_files(files) {
        return Err(rollback_files(&targets, &backups, error));
    }
    for (_, backup) in backups {
        let _ = fs::remove_file(backup);
    }
    Ok(())
}

fn move_file_backups(
    files: &[(&Path, Option<NamedTempFile>, &str)],
) -> Result<Vec<(PathBuf, PathBuf)>, String> {
    let mut backups = Vec::new();
    for (target, _, message) in files {
        if fs::symlink_metadata(target).is_ok() {
            let parent = target
                .parent()
                .ok_or_else(|| "Invalid sketch path.".to_owned())?;
            let backup = NamedTempFile::new_in(parent).map_err(|_| (*message).to_owned())?;
            let backup_path = backup
                .into_temp_path()
                .keep()
                .map_err(|_| (*message).to_owned())?;
            fs::remove_file(&backup_path).map_err(|_| (*message).to_owned())?;
            backups.push((target.to_path_buf(), backup_path));
        }
    }
    for (index, (target, backup)) in backups.iter().enumerate() {
        if fs::rename(target, backup).is_err() {
            let restore_error = restore_backups(&backups[..index]);
            let message = files
                .iter()
                .find(|(path, _, _)| *path == target)
                .map(|(_, _, message)| *message)
                .unwrap_or("Unable to save the sketch bundle.");
            return Err(restore_error.unwrap_or_else(|| message.to_owned()));
        }
    }
    Ok(backups)
}

fn install_files(files: Vec<(&Path, Option<NamedTempFile>, &str)>) -> Result<(), String> {
    for (target, stage, message) in files {
        if let Some(stage) = stage {
            stage.persist(target).map_err(|_| message.to_owned())?;
        }
    }
    Ok(())
}

fn rollback_files(targets: &[&Path], backups: &[(PathBuf, PathBuf)], error: String) -> String {
    for target in targets {
        let _ = fs::remove_file(target);
    }
    restore_backups(backups).unwrap_or(error)
}

fn restore_backups(backups: &[(PathBuf, PathBuf)]) -> Option<String> {
    let mut failures = Vec::new();
    for (target, backup) in backups.iter().rev() {
        if let Err(error) = fs::rename(backup, target) {
            failures.push(format!(
                "Could not restore {}: {error}. Original preserved at {}.",
                target.display(),
                backup.display(),
            ));
        }
    }
    (!failures.is_empty()).then(|| {
        format!(
			"Sketch save failed and rollback was incomplete. Recover the original files manually: {}",
			failures.join(" "),
		)
    })
}

#[cfg(test)]
mod tests {
    use super::{install_files, move_file_backups, rollback_files, stage_bytes};
    use std::fs;

    #[test]
    fn failed_thumbnail_install_restores_all_original_bundle_files() {
        let directory = tempfile::tempdir().expect("create sketch directory");
        let source = directory.path().join("orbit.gic");
        let description = directory.path().join("description.md");
        let thumbnail = directory.path().join("thumbnail.png");
        fs::write(&source, "original source").expect("write source");
        fs::write(&description, "original description").expect("write description");
        fs::write(&thumbnail, "original PNG").expect("write thumbnail");
        let files = vec![
            (
                source.as_path(),
                Some(stage_bytes(directory.path(), b"replacement source", "source").unwrap()),
                "Unable to replace the sketch file.",
            ),
            (
                description.as_path(),
                Some(
                    stage_bytes(directory.path(), b"replacement description", "description")
                        .unwrap(),
                ),
                "Unable to write the sketch description.",
            ),
            (
                thumbnail.as_path(),
                Some(stage_bytes(directory.path(), b"replacement PNG", "thumbnail").unwrap()),
                "Unable to write the sketch thumbnail.",
            ),
        ];
        let targets = [source.as_path(), description.as_path(), thumbnail.as_path()];
        let backups = move_file_backups(&files).expect("move original files to backups");
        let staged_thumbnail = files[2].1.as_ref().expect("staged thumbnail").path();
        fs::remove_file(staged_thumbnail).expect("force actual staged-file install failure");
        let error = install_files(files).expect_err("install should fail on the removed file");

        assert_eq!(rollback_files(&targets, &backups, error.clone()), error);
        assert_eq!(fs::read(&source).unwrap(), b"original source");
        assert_eq!(fs::read(&description).unwrap(), b"original description");
        assert_eq!(fs::read(&thumbnail).unwrap(), b"original PNG");
    }
}
