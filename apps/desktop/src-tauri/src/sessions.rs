// ABOUTME: Persists transparent append-only Agent sessions beside each sketch.
// ABOUTME: Recovers complete records after partial writes and clones Save As history.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
};
use tempfile::NamedTempFile;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub(crate) enum SessionRecord {
    Session {
        id: String,
        name: String,
        started_at: DateTime<Utc>,
    },
    Message {
        session_id: String,
        role: String,
        text: String,
        at: DateTime<Utc>,
    },
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SessionSummary {
    pub(crate) session_id: String,
    pub(crate) name: String,
}

#[derive(Default)]
pub(crate) struct SessionStore;

impl SessionStore {
    pub(crate) fn create_in(&self, sketch_dir: &Path, name: &str) -> Result<String, String> {
        let name = name.trim();
        if name.is_empty() {
            return Err("Agent session name is required.".to_owned());
        }
        let session_id = Uuid::new_v4().to_string();
        let record = SessionRecord::Session {
            id: session_id.clone(),
            name: name.to_owned(),
            started_at: Utc::now(),
        };
        self.write_new(sketch_dir, &session_id, std::slice::from_ref(&record))?;
        Ok(session_id)
    }

    pub(crate) fn latest_summary(
        &self,
        sketch_dir: &Path,
    ) -> Result<Option<SessionSummary>, String> {
        let Some((session_id, records)) = self.latest_records(sketch_dir)? else {
            return Ok(None);
        };
        let name = records
            .iter()
            .find_map(|record| match record {
                SessionRecord::Session { name, .. } => Some(name.clone()),
                _ => None,
            })
            .unwrap_or_else(|| "Current sketch".to_owned());
        Ok(Some(SessionSummary { session_id, name }))
    }

    pub(crate) fn read_in(
        &self,
        sketch_dir: &Path,
        session_id: &str,
    ) -> Result<Vec<SessionRecord>, String> {
        let path = self.session_path(sketch_dir, session_id)?;
        if !path.exists() {
            return Err("Unknown Agent session.".to_owned());
        }
        let contents =
            fs::read_to_string(path).map_err(|_| "Unable to read the Agent session.".to_owned())?;
        Ok(contents
            .split_inclusive('\n')
            .filter_map(|line| serde_json::from_str(line).ok())
            .collect())
    }

    pub(crate) fn append_in(
        &self,
        sketch_dir: &Path,
        session_id: &str,
        role: &str,
        text: &str,
    ) -> Result<(), String> {
        let path = self.session_path(sketch_dir, session_id)?;
        if !path.exists() {
            return Err("Unknown Agent session.".to_owned());
        }
        truncate_partial_record(&path)?;
        let mut line = serde_json::to_vec(&SessionRecord::Message {
            session_id: session_id.to_owned(),
            role: role.to_owned(),
            text: text.to_owned(),
            at: Utc::now(),
        })
        .map_err(|_| "Unable to serialize the Agent session.".to_owned())?;
        line.push(b'\n');
        let mut file = OpenOptions::new()
            .append(true)
            .open(path)
            .map_err(|_| "Unable to open the Agent session.".to_owned())?;
        file.write_all(&line)
            .and_then(|()| file.sync_data())
            .map_err(|_| "Unable to append to the Agent session.".to_owned())
    }

    pub(crate) fn clone_latest_between(
        &self,
        source_dir: &Path,
        target_dir: &Path,
    ) -> Result<Option<String>, String> {
        let Some((_, records)) = self.latest_records(source_dir)? else {
            return Ok(None);
        };
        let session_id = Uuid::new_v4().to_string();
        let mut cloned = Vec::new();
        for record in records {
            cloned.push(match record {
                SessionRecord::Session { name, .. } => SessionRecord::Session {
                    id: session_id.clone(),
                    name,
                    started_at: Utc::now(),
                },
                SessionRecord::Message { role, text, at, .. } => SessionRecord::Message {
                    session_id: session_id.clone(),
                    role,
                    text,
                    at,
                },
            });
        }
        self.write_new(target_dir, &session_id, &cloned)?;
        Ok(Some(session_id))
    }

    fn latest_records(
        &self,
        sketch_dir: &Path,
    ) -> Result<Option<(String, Vec<SessionRecord>)>, String> {
        let sessions_dir = sketch_dir.join("sessions");
        let entries = match fs::read_dir(sessions_dir) {
            Ok(entries) => entries,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
            Err(_) => return Err("Unable to read Agent sessions.".to_owned()),
        };
        for entry in entries {
            let entry = entry.map_err(|_| "Unable to read Agent sessions.".to_owned())?;
            let path = entry.path();
            if path.extension().and_then(|extension| extension.to_str()) != Some("jsonl") {
                continue;
            }
            let Some(id) = path.file_stem().and_then(|stem| stem.to_str()) else {
                continue;
            };
            return Ok(Some((id.to_owned(), self.read_in(sketch_dir, id)?)));
        }
        Ok(None)
    }

    pub(crate) fn remove_in(&self, sketch_dir: &Path, session_id: &str) -> Result<(), String> {
        let path = self.session_path(sketch_dir, session_id)?;
        match fs::remove_file(path) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(_) => Err("Unable to remove the copied Agent session.".to_owned()),
        }
    }

    fn write_new(
        &self,
        sketch_dir: &Path,
        session_id: &str,
        records: &[SessionRecord],
    ) -> Result<(), String> {
        let path = self.session_path(sketch_dir, session_id)?;
        let contents = records
            .iter()
            .map(|record| {
                serde_json::to_string(record)
                    .map(|line| format!("{line}\n"))
                    .map_err(|_| "Unable to serialize the Agent session.".to_owned())
            })
            .collect::<Result<Vec<_>, _>>()?
            .join("");
        let parent = path
            .parent()
            .ok_or_else(|| "Agent session path has no parent.".to_owned())?;
        fs::create_dir_all(parent).map_err(|_| "Unable to prepare Agent sessions.".to_owned())?;
        let mut file = NamedTempFile::new_in(parent)
            .map_err(|_| "Unable to prepare Agent sessions.".to_owned())?;
        file.write_all(contents.as_bytes())
            .and_then(|()| file.as_file().sync_all())
            .map_err(|_| "Unable to write the Agent session.".to_owned())?;
        file.persist_noclobber(path)
            .map_err(|_| "Unable to create the Agent session.".to_owned())?;
        Ok(())
    }

    fn session_path(&self, sketch_dir: &Path, session_id: &str) -> Result<PathBuf, String> {
        Uuid::parse_str(session_id).map_err(|_| "Invalid Agent session ID.".to_owned())?;
        Ok(sketch_dir
            .join("sessions")
            .join(format!("{session_id}.jsonl")))
    }
}

fn truncate_partial_record(path: &Path) -> Result<(), String> {
    let contents = fs::read(path).map_err(|_| "Unable to read the Agent session.".to_owned())?;
    let complete_length = contents
        .iter()
        .rposition(|byte| *byte == b'\n')
        .map(|index| index + 1)
        .unwrap_or(0);
    if complete_length < contents.len() {
        OpenOptions::new()
            .write(true)
            .open(path)
            .map_err(|_| "Unable to repair the Agent session.".to_owned())?
            .set_len(complete_length as u64)
            .map_err(|_| "Unable to repair the Agent session.".to_owned())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{SessionRecord, SessionStore};
    use std::{
        fs,
        path::{Path, PathBuf},
    };

    fn directory(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!("gic-sessions-{}-{name}", std::process::id()))
    }

    fn remove(path: &Path) {
        if path.exists() {
            fs::remove_dir_all(path).expect("remove test directory");
        }
    }

    #[test]
    fn stores_sessions_in_the_sketch_folder() {
        let root = directory("local");
        remove(&root);
        let store = SessionStore;
        let id = store.create_in(&root, "Sketch help").expect("create");
        store
            .append_in(&root, &id, "student", "Why?")
            .expect("append");
        assert!(root.join("sessions").join(format!("{id}.jsonl")).is_file());
        let records = store.read_in(&root, &id).expect("read");
        assert_eq!(records.len(), 2);
        assert!(matches!(&records[1], SessionRecord::Message { role, .. } if role == "student"));
        remove(&root);
    }

    #[test]
    fn clones_latest_session_for_save_as() {
        let source = directory("source");
        let target = directory("target");
        remove(&source);
        remove(&target);
        let store = SessionStore;
        let id = store.create_in(&source, "Sketch help").expect("create");
        store
            .append_in(&source, &id, "student", "Why?")
            .expect("append");
        let clone = store
            .clone_latest_between(&source, &target)
            .expect("clone")
            .expect("session");
        assert_ne!(clone, id);
        assert_eq!(store.read_in(&target, &clone).expect("read").len(), 2);
        remove(&source);
        remove(&target);
    }
}
