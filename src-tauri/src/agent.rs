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
const ZEN_MODELS_URL: &str = "https://opencode.ai/zen/v1/models";

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

#[derive(Deserialize)]
struct ModelList {
    #[serde(default)]
    data: Vec<ModelInfo>,
}

#[derive(Deserialize)]
struct ModelInfo {
    id: String,
    #[serde(default)]
    name: Option<String>,
}

fn validate_model(model: &str) -> Result<(), String> {
    if model.trim().is_empty() {
        return Err("Choose an OpenCode model.".to_owned());
    }
    Ok(())
}

fn safe_error(status: reqwest::StatusCode) -> String {
    match status {
        reqwest::StatusCode::UNAUTHORIZED => {
            "OpenCode request failed (HTTP 401): the API key was rejected. Sign in again.".to_owned()
        }
        reqwest::StatusCode::TOO_MANY_REQUESTS => {
            "OpenCode request failed (HTTP 429): the request was rate-limited. Try again later.".to_owned()
        }
        reqwest::StatusCode::NOT_FOUND => {
            "OpenCode request failed (HTTP 404): the selected model is unavailable. Choose another model.".to_owned()
        }
        status => format!(
            "OpenCode request failed (HTTP {}). Choose another model or try again later.",
            status.as_u16()
        ),
    }
}

pub(crate) async fn validate_opencode_key(api_key: &str) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .user_agent("gic/0.1")
        .build()
        .map_err(|_| "OpenCode client could not start.".to_owned())?;
    let response = client
        .get(ZEN_MODELS_URL)
        .bearer_auth(api_key)
        .send()
        .await
        .map_err(|error| format!("OpenCode could not be reached: {error}."))?;
    if response.status().is_success() {
        Ok(())
    } else {
        Err(safe_error(response.status()))
    }
}

#[tauri::command]
pub(crate) async fn opencode_models(
    credentials: State<'_, CredentialStore>,
) -> Result<Vec<TutorModel>, String> {
    let api_key = credentials.with_opencode_key(|key| key.to_owned())?;
    let client = reqwest::Client::builder()
        .user_agent("gic/0.1")
        .build()
        .map_err(|_| "OpenCode client could not start.".to_owned())?;
    let response = client
        .get(ZEN_MODELS_URL)
        .bearer_auth(api_key)
        .send()
        .await
        .map_err(|error| {
            format!(
                "OpenCode models request could not reach the provider: {error}. Check the network and try again."
            )
        })?;
    if !response.status().is_success() {
        return Err(safe_error(response.status()));
    }
    let list = response
        .json::<ModelList>()
        .await
        .map_err(|_| "OpenCode returned an invalid model list.".to_owned())?;
    Ok(list
        .data
        .into_iter()
        .map(|model| TutorModel {
            name: model.name.unwrap_or_else(|| model.id.clone()),
            id: model.id,
            curated: true,
        })
        .collect())
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
) -> Result<(), String> {
    validate_model(&model)?;
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
    let client = reqwest::Client::builder()
        .user_agent("gic/0.1")
        .build()
        .map_err(|_| "OpenCode client could not start.".to_owned())?;
    let response = client
        .post(ZEN_URL)
        .bearer_auth(api_key)
        .header("x-opencode-session", "gic-tutor")
        .json(&serde_json::json!({
            "model": model,
            "input": [{
                "role": "user",
                "content": [{
                    "type": "input_text",
                    "text": input
                }]
            }],
            "stream": true
        }))
        .send()
        .await
        .map_err(|error| {
            format!(
                "OpenCode request could not reach the provider: {error}. Check the network and try again."
            )
        })?;
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
        let chunk = chunk.map_err(|error| format!("OpenCode response stream failed: {error}."))?;
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
                let message = "OpenCode returned an invalid response event.".to_owned();
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
