// ABOUTME: Persists transparent append-only Agent sessions in the projects workspace.
// ABOUTME: Recovers complete records after partial writes and keeps sketch relationships durable.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(
    tag = "type",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub(crate) enum SessionRecord {
    Session {
        id: String,
        name: String,
        started_at: DateTime<Utc>,
        sketch_id: String,
    },
    Message {
        session_id: String,
        role: String,
        text: String,
        at: DateTime<Utc>,
    },
    Compaction {
        session_id: String,
        at: DateTime<Utc>,
        message_count: usize,
    },
    Relationship {
        session_id: String,
        at: DateTime<Utc>,
        sketch_id: String,
        sketch_name: String,
    },
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SessionSummary {
    pub(crate) session_id: String,
    pub(crate) name: String,
    pub(crate) sketch_id: String,
}

#[derive(Default)]
pub(crate) struct SessionStore {
    sessions_dir: Mutex<Option<PathBuf>>,
}

impl SessionStore {
    pub(crate) fn set_sessions_dir(&self, path: PathBuf) -> Result<(), String> {
        fs::create_dir_all(&path).map_err(|_| "Unable to prepare Agent sessions.".to_owned())?;
        *self
            .sessions_dir
            .lock()
            .map_err(|_| "Agent sessions are unavailable.".to_owned())? = Some(path);
        Ok(())
    }

    pub(crate) fn create(&self, name: &str, sketch_id: &str) -> Result<String, String> {
        self.create_from(name, sketch_id, None)
    }

    pub(crate) fn clone_session(
        &self,
        session_id: &str,
        name: &str,
        sketch_id: &str,
    ) -> Result<String, String> {
        self.create_from(name, sketch_id, Some(session_id))
    }

    pub(crate) fn append_message(
        &self,
        session_id: &str,
        role: &str,
        text: &str,
    ) -> Result<(), String> {
        self.append(
            session_id,
            &SessionRecord::Message {
                session_id: session_id.to_owned(),
                role: role.to_owned(),
                text: text.to_owned(),
                at: Utc::now(),
            },
        )
    }

    pub(crate) fn compact(&self, session_id: &str) -> Result<usize, String> {
        let message_count = self
            .read_records(session_id)?
            .iter()
            .filter(|record| {
                matches!(
                    record,
                    SessionRecord::Message { session_id: id, .. } if id == session_id
                )
            })
            .count();
        self.append(
            session_id,
            &SessionRecord::Compaction {
                session_id: session_id.to_owned(),
                at: Utc::now(),
                message_count,
            },
        )?;
        Ok(message_count)
    }

    pub(crate) fn update_relationship(
        &self,
        session_id: &str,
        sketch_id: &str,
        sketch_name: &str,
    ) -> Result<(), String> {
        self.append(
            session_id,
            &SessionRecord::Relationship {
                session_id: session_id.to_owned(),
                at: Utc::now(),
                sketch_id: sketch_id.to_owned(),
                sketch_name: sketch_name.to_owned(),
            },
        )
    }

    pub(crate) fn find_for_sketch(
        &self,
        requested_sketch_id: &str,
    ) -> Result<Option<SessionSummary>, String> {
        let sessions_dir = self
            .sessions_dir
            .lock()
            .map_err(|_| "Agent sessions are unavailable.".to_owned())?
            .clone()
            .ok_or_else(|| "Agent sessions are not configured.".to_owned())?;
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
            let Some(session_id) = path.file_stem().and_then(|stem| stem.to_str()) else {
                continue;
            };
            let records = self.read_records(session_id)?;
            let Some(summary) = records.iter().find_map(|record| match record {
                SessionRecord::Session {
                    id,
                    name,
                    sketch_id,
                    ..
                } if sketch_id == requested_sketch_id => Some(SessionSummary {
                    session_id: id.clone(),
                    name: name.clone(),
                    sketch_id: sketch_id.clone(),
                }),
                _ => None,
            }) else {
                continue;
            };
            return Ok(Some(summary));
        }
        Ok(None)
    }

    pub(crate) fn read_records(&self, session_id: &str) -> Result<Vec<SessionRecord>, String> {
        validate_session_id(session_id)?;
        let path = self.session_path(session_id)?;
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

    fn create_from(
        &self,
        name: &str,
        sketch_id: &str,
        source_session_id: Option<&str>,
    ) -> Result<String, String> {
        let name = name.trim();
        if name.is_empty() || sketch_id.trim().is_empty() {
            return Err("Agent session name and sketch identity are required.".to_owned());
        }
        let session_id = Uuid::new_v4().to_string();
        let mut records = vec![SessionRecord::Session {
            id: session_id.clone(),
            name: name.to_owned(),
            started_at: Utc::now(),
            sketch_id: sketch_id.to_owned(),
        }];
        if let Some(source_session_id) = source_session_id {
            records.extend(
                self.read_records(source_session_id)?
                    .into_iter()
                    .filter_map(|record| match record {
                        SessionRecord::Message { role, text, at, .. } => {
                            Some(SessionRecord::Message {
                                session_id: session_id.clone(),
                                role,
                                text,
                                at,
                            })
                        }
                        SessionRecord::Session { .. }
                        | SessionRecord::Relationship { .. }
                        | SessionRecord::Compaction { .. } => None,
                    }),
            );
        }
        let path = self.session_path(&session_id)?;
        let mut contents = String::new();
        for record in records {
            contents.push_str(
                &serde_json::to_string(&record)
                    .map_err(|_| "Unable to serialize the Agent session.".to_owned())?,
            );
            contents.push('\n');
        }
        write_new_session(&path, contents.as_bytes())?;
        Ok(session_id)
    }

    fn append(&self, session_id: &str, record: &SessionRecord) -> Result<(), String> {
        validate_session_id(session_id)?;
        let path = self.session_path(session_id)?;
        if !path.exists() {
            return Err("Unknown Agent session.".to_owned());
        }
        truncate_partial_record(&path)?;
        let mut line = serde_json::to_vec(record)
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

    fn session_path(&self, session_id: &str) -> Result<PathBuf, String> {
        validate_session_id(session_id)?;
        let sessions_dir = self
            .sessions_dir
            .lock()
            .map_err(|_| "Agent sessions are unavailable.".to_owned())?
            .clone()
            .ok_or_else(|| "Agent sessions are not configured.".to_owned())?;
        Ok(sessions_dir.join(format!("{session_id}.jsonl")))
    }
}

fn validate_session_id(session_id: &str) -> Result<(), String> {
    Uuid::parse_str(session_id).map_err(|_| "Invalid Agent session ID.".to_owned())?;
    Ok(())
}

fn truncate_partial_record(path: &Path) -> Result<(), String> {
    let contents = fs::read(path).map_err(|_| "Unable to read the Agent session.".to_owned())?;
    let complete_length = contents
        .iter()
        .rposition(|byte| *byte == b'\n')
        .map(|index| index + 1)
        .unwrap_or(0);
    if complete_length < contents.len() {
        let file = OpenOptions::new()
            .write(true)
            .open(path)
            .map_err(|_| "Unable to repair the Agent session.".to_owned())?;
        file.set_len(complete_length as u64)
            .map_err(|_| "Unable to repair the Agent session.".to_owned())?;
    }
    Ok(())
}

fn write_new_session(path: &Path, contents: &[u8]) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Agent session path has no parent.".to_owned())?;
    fs::create_dir_all(parent).map_err(|_| "Unable to prepare Agent sessions.".to_owned())?;
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
        .map_err(|_| "Unable to create the Agent session.".to_owned())?;
    file.write_all(contents)
        .and_then(|()| file.sync_data())
        .map_err(|_| "Unable to write the Agent session.".to_owned())
}

#[cfg(test)]
mod tests {
    use super::{SessionRecord, SessionStore};
    use std::{
        fs,
        io::Write,
        path::{Path, PathBuf},
    };

    fn test_directory(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!("gic-sessions-{}-{name}", std::process::id()))
    }

    fn remove_test_directory(path: &Path) {
        if path.exists() {
            fs::remove_dir_all(path).expect("remove test directory");
        }
    }

    #[test]
    fn finds_a_session_by_durable_sketch_identity() {
        let directory = test_directory("find");
        remove_test_directory(&directory);
        let store = SessionStore::default();
        store
            .set_sessions_dir(directory.clone())
            .expect("configure sessions");
        let id = store
            .create("Sketch help", "sketch-a")
            .expect("create session");
        store
            .append_message(&id, "student", "Why?")
            .expect("append message");

        let summary = store
            .find_for_sketch("sketch-a")
            .expect("find session")
            .expect("session summary");
        assert_eq!(summary.session_id, id);
        assert_eq!(summary.sketch_id, "sketch-a");
        assert_eq!(summary.name, "Sketch help");
        assert!(store
            .find_for_sketch("sketch-b")
            .expect("find missing")
            .is_none());
        remove_test_directory(&directory);
    }

    #[test]
    fn appends_messages_and_recovers_complete_records_after_a_partial_write() {
        let directory = test_directory("append");
        remove_test_directory(&directory);
        let store = SessionStore::default();
        store
            .set_sessions_dir(directory.clone())
            .expect("configure sessions");
        let id = store
            .create("Sketch help", "sketch-a")
            .expect("create session");
        store
            .append_message(&id, "student", "Why?")
            .expect("append student");
        store
            .append_message(&id, "agent", "Try one change.")
            .expect("append agent");
        let path = directory.join(format!("{id}.jsonl"));
        let mut file = fs::OpenOptions::new()
            .append(true)
            .open(&path)
            .expect("open session");
        file.write_all(br#"{"type":"message"#)
            .expect("write partial record");
        drop(file);

        let records = store.read_records(&id).expect("recover session");
        assert_eq!(records.len(), 3);
        assert!(matches!(&records[2], SessionRecord::Message { role, .. } if role == "agent"));
        store
            .append_message(&id, "agent", "A later message.")
            .expect("append after repair");
        assert_eq!(
            store
                .read_records(&id)
                .expect("read repaired session")
                .len(),
            4
        );
        remove_test_directory(&directory);
    }

    #[test]
    fn clones_messages_with_a_new_identity_and_relationship() {
        let directory = test_directory("clone");
        remove_test_directory(&directory);
        let store = SessionStore::default();
        store
            .set_sessions_dir(directory.clone())
            .expect("configure sessions");
        let source = store
            .create("Sketch help", "sketch-a")
            .expect("create session");
        store
            .append_message(&source, "student", "Why?")
            .expect("append message");
        let clone = store
            .clone_session(&source, "Continued", "sketch-b")
            .expect("clone session");
        store
            .update_relationship(&clone, "sketch-b-renamed", "New name")
            .expect("update relationship");

        let records = store.read_records(&clone).expect("read clone");
        assert_ne!(clone, source);
        assert!(
            matches!(&records[0], SessionRecord::Session { sketch_id, .. } if sketch_id == "sketch-b")
        );
        assert!(
            matches!(&records[1], SessionRecord::Message { session_id, .. } if session_id == &clone)
        );
        assert!(
            matches!(&records[2], SessionRecord::Relationship { sketch_id, .. } if sketch_id == "sketch-b-renamed")
        );
        remove_test_directory(&directory);
    }

    #[test]
    fn records_an_explicit_message_count_at_compaction() {
        let directory = test_directory("compact");
        remove_test_directory(&directory);
        let store = SessionStore::default();
        store
            .set_sessions_dir(directory.clone())
            .expect("configure sessions");
        let id = store
            .create("Sketch help", "sketch-a")
            .expect("create session");
        store
            .append_message(&id, "student", "Why?")
            .expect("append student");
        store
            .append_message(&id, "agent", "Try one change.")
            .expect("append agent");

        assert_eq!(store.compact(&id).expect("compact"), 2);
        assert!(matches!(
            &store.read_records(&id).expect("read")[3],
            SessionRecord::Compaction {
                message_count: 2,
                ..
            }
        ));
        remove_test_directory(&directory);
    }
}
