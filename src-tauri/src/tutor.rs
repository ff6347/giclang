// ABOUTME: Streams constrained Socratic requests through the OpenCode Zen API.
// ABOUTME: Keeps provider credentials and cancellation state inside the native desktop boundary.

use crate::credentials::CredentialStore;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use tauri::{AppHandle, Emitter, State};

const EVENT_NAME: &str = "opencode-agent-event";
const ZEN_URL: &str = "https://opencode.ai/zen/v1/responses";
const CURATED_MODELS: [&str; 3] = ["gpt-5.5", "claude-sonnet-5", "gemini-3.1-pro"];

#[derive(Clone, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub(crate) enum AgentEvent {
    Text { text: String },
    Complete,
    Cancelled,
    Error { message: String },
}

#[derive(Serialize)]
pub(crate) struct TutorModel {
    pub id: String,
    pub name: String,
    pub curated: bool,
}

pub(crate) struct TutorState {
    request: Mutex<Option<Arc<AtomicBool>>>,
}

impl Default for TutorState {
    fn default() -> Self {
        Self {
            request: Mutex::new(None),
        }
    }
}

#[derive(Deserialize)]
struct ResponsesChunk {
    #[serde(default)]
    r#type: String,
    #[serde(default)]
    delta: Option<String>,
    #[serde(default)]
    error: Option<ResponsesError>,
}

#[derive(Deserialize)]
struct ResponsesError;

fn models() -> Vec<TutorModel> {
    CURATED_MODELS
        .iter()
        .map(|id| TutorModel {
            id: (*id).to_owned(),
            name: (*id).to_owned(),
            curated: true,
        })
        .collect()
}

fn validate_model(model: &str, advanced: bool) -> Result<(), String> {
    if !advanced && !CURATED_MODELS.contains(&model) {
        return Err("Choose one of the curated OpenCode models.".to_owned());
    }
    if model.trim().is_empty() {
        return Err("Choose an OpenCode model.".to_owned());
    }
    Ok(())
}

fn safe_error(status: reqwest::StatusCode) -> String {
    match status {
        reqwest::StatusCode::UNAUTHORIZED => {
            "OpenCode rejected the API key. Sign in again.".to_owned()
        }
        reqwest::StatusCode::TOO_MANY_REQUESTS => {
            "OpenCode is rate-limiting this request. Try again later.".to_owned()
        }
        reqwest::StatusCode::NOT_FOUND => {
            "That OpenCode model is unavailable. Choose another model.".to_owned()
        }
        _ => "OpenCode could not answer right now. Try again later.".to_owned(),
    }
}

#[tauri::command]
pub(crate) fn opencode_models(advanced: bool) -> Vec<TutorModel> {
    let mut result = models();
    if advanced {
        result.push(TutorModel {
            id: "gpt-5.4".to_owned(),
            name: "GPT-5.4".to_owned(),
            curated: false,
        });
    }
    result
}

#[tauri::command]
pub(crate) fn cancel_opencode_request(state: State<'_, TutorState>) -> Result<(), String> {
    if let Some(request) = state
        .request
        .lock()
        .map_err(|_| "Tutor request is unavailable.".to_owned())?
        .as_ref()
    {
        request.store(true, Ordering::SeqCst);
    }
    Ok(())
}

#[tauri::command]
pub(crate) async fn send_opencode_request(
    app: AppHandle,
    credentials: State<'_, CredentialStore>,
    state: State<'_, TutorState>,
    question: String,
    context: String,
    model: String,
    advanced: bool,
) -> Result<(), String> {
    validate_model(&model, advanced)?;
    let cancellation = Arc::new(AtomicBool::new(false));
    {
        let mut request = state
            .request
            .lock()
            .map_err(|_| "Tutor request is unavailable.".to_owned())?;
        if request.is_some() {
            return Err("An OpenCode request is already running.".to_owned());
        }
        *request = Some(cancellation.clone());
    }
    let result = stream_request(
        &app,
        &credentials,
        cancellation.clone(),
        question,
        context,
        model,
    )
    .await;
    if let Ok(mut request) = state.request.lock() {
        *request = None;
    }
    result
}

async fn stream_request(
    app: &AppHandle,
    credentials: &CredentialStore,
    cancellation: Arc<AtomicBool>,
    question: String,
    context: String,
    model: String,
) -> Result<(), String> {
    let api_key = credentials.with_opencode_key(|key| key.to_owned())?;
    let input = format!("{}\n\nStudent question: {}", context, question);
    let response = reqwest::Client::new()
        .post(ZEN_URL)
        .bearer_auth(api_key)
        .header("x-opencode-session", "gic-tutor")
        .json(&serde_json::json!({ "model": model, "input": input, "stream": true }))
        .send()
        .await
        .map_err(|_| "OpenCode is unavailable or you are offline.".to_owned())?;
    let status = response.status();
    if !status.is_success() {
        let _ = app.emit(
            EVENT_NAME,
            AgentEvent::Error {
                message: safe_error(status),
            },
        );
        return Err(safe_error(status));
    }
    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    while let Some(chunk) = stream.next().await {
        if cancellation.load(Ordering::SeqCst) {
            let _ = app.emit(EVENT_NAME, AgentEvent::Cancelled);
            return Ok(());
        }
        let chunk = chunk.map_err(|_| "OpenCode response was interrupted.".to_owned())?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));
        while let Some(index) = buffer.find('\n') {
            let line = buffer[..index].trim().to_owned();
            buffer.drain(..=index);
            if !line.starts_with("data:") {
                continue;
            }
            let data = line.trim_start_matches("data:").trim();
            if data == "[DONE]" {
                let _ = app.emit(EVENT_NAME, AgentEvent::Complete);
                return Ok(());
            }
            let Ok(chunk) = serde_json::from_str::<ResponsesChunk>(data) else {
                continue;
            };
            if chunk.error.is_some() {
                let message = "OpenCode returned an invalid response.".to_owned();
                let _ = app.emit(
                    EVENT_NAME,
                    AgentEvent::Error {
                        message: message.clone(),
                    },
                );
                return Err(message);
            }
            if chunk.r#type.contains("output_text.delta") {
                if let Some(text) = chunk.delta {
                    let _ = app.emit(EVENT_NAME, AgentEvent::Text { text });
                }
            }
        }
    }
    let _ = app.emit(EVENT_NAME, AgentEvent::Complete);
    Ok(())
}
