//! Privileged application boundary: credentials and Rig stay out of the webview.

use futures_util::StreamExt;
use gic_tutor_spike_core::{RequestGate, TutorEvent, safe_error};
use rig_core::{
    client::CompletionClient,
    completion::{AssistantContent, CompletionModel},
    providers::{chatgpt, openai},
    streaming::StreamingCompletionResponse,
};
use std::{
    fs,
    future::Future,
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tauri::{AppHandle, Emitter, Manager};
use tokio_util::sync::CancellationToken;

const ZEN_FREE_MODEL: &str = "mimo-v2.5-free";
const CODEX_MODEL: &str = "gpt-5.3-instant";
const ZEN_BASE_URL: &str = "https://opencode.ai/zen/v1";
const CHATGPT_AUTH_FILE: &str = "chatgpt-rig-auth.json";

struct Session {
    // Zen credentials are memory-only and never serialized.
    opencode_key: Option<String>,
    active: Option<CancellationToken>,
    authorization_url: Option<String>,
    gate: RequestGate,
    opencode_session: String,
}

impl Default for Session {
    fn default() -> Self {
        Self {
            opencode_key: None,
            active: None,
            authorization_url: None,
            gate: RequestGate::default(),
            // An app session is one OpenCode conversation until the UI grows
            // explicit conversation controls.
            opencode_session: uuid::Uuid::new_v4().to_string(),
        }
    }
}

fn emit(app: &AppHandle, event: TutorEvent) {
    let _ = app.emit("gic:tutor-event", event);
}

fn auth_file(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_config_dir()
        .map_err(|_| "ChatGPT sign-in is unavailable on this system.")?;
    fs::create_dir_all(&directory).map_err(|_| "ChatGPT sign-in is unavailable on this system.")?;
    Ok(directory.join(CHATGPT_AUTH_FILE))
}

fn begin_request(state: &Mutex<Session>) -> Result<CancellationToken, String> {
    let mut session = state.lock().map_err(|_| "Tutor state is unavailable.")?;
    if !session.gate.begin() {
        return Err("A tutor request is already in progress.".into());
    }
    let cancel = CancellationToken::new();
    session.active = Some(cancel.clone());
    Ok(cancel)
}

fn finish_request(state: &Mutex<Session>) {
    if let Ok(mut session) = state.lock() {
        session.active = None;
        session.gate.finish();
    }
}

/// The sole command accepting a key. It never returns or persists the key.
#[tauri::command]
fn connect_opencode(
    state: tauri::State<'_, Arc<Mutex<Session>>>,
    api_key: String,
) -> Result<(), String> {
    if api_key.trim().is_empty() {
        return Err("Enter an OpenCode Zen API key before connecting.".into());
    }
    state
        .lock()
        .map_err(|_| "Tutor state is unavailable.")?
        .opencode_key = Some(api_key);
    Ok(())
}

#[tauri::command]
fn begin_chatgpt_sign_in(
    app: AppHandle,
    state: tauri::State<'_, Arc<Mutex<Session>>>,
) -> Result<(), String> {
    let auth_file = auth_file(&app)?;
    let cancel = begin_request(&state)?;
    let app_for_task = app.clone();
    let session = state.inner().clone();
    tauri::async_runtime::spawn(async move {
        emit(
            &app_for_task,
            TutorEvent::Status {
                message: "Starting ChatGPT device authorization.".into(),
            },
        );
        // Rig starts its device flow when it obtains OAuth credentials. Its
        // callback supplies the verification URL and one-time user code; no
        // renderer input can choose either value.
        let callback_app = app_for_task.clone();
        let callback_state = session.clone();
        let client = chatgpt::Client::builder()
            .oauth()
            .auth_file(auth_file)
            .on_device_code(move |prompt| {
                if let Ok(mut session) = callback_state.lock() {
                    session.authorization_url = Some(prompt.verification_uri.clone());
                }
                emit(
                    &callback_app,
                    TutorEvent::DeviceAuthorization {
                        url: prompt.verification_uri,
                        user_code: prompt.user_code,
                    },
                );
            })
            .allow_device_flow(true)
            .build();
        let outcome = match client {
            Ok(client) => {
                let model = client.completion_model(CODEX_MODEL);
                // This starts Rig's OAuth flow immediately after the explicit
                // Sign in click. The authentication probe's completion is
                // discarded and never presented as a tutor reply.
                consume_stream(model.stream(model.completion_request("").build()), cancel).await
            }
            Err(_) => Err(StreamFailure::Provider),
        };
        match outcome {
            Ok(_) => emit(&app_for_task, TutorEvent::SignedIn),
            Err(StreamFailure::Cancelled) => emit(&app_for_task, TutorEvent::Cancelled),
            Err(StreamFailure::Provider) => {
                emit(&app_for_task, safe_error("ChatGPT sign-in failed"))
            }
        }
        finish_request(&session);
    });
    Ok(())
}

#[tauri::command]
fn open_chatgpt_authorization_url(
    state: tauri::State<'_, Arc<Mutex<Session>>>,
) -> Result<(), String> {
    let url = state
        .lock()
        .map_err(|_| "Tutor state is unavailable.")?
        .authorization_url
        .clone()
        .ok_or("Start ChatGPT sign-in first.")?;
    open::that_detached(url).map_err(|_| "Could not open the ChatGPT authorization page.".into())
}

#[tauri::command]
fn sign_out_chatgpt(
    app: AppHandle,
    state: tauri::State<'_, Arc<Mutex<Session>>>,
) -> Result<(), String> {
    let file = auth_file(&app)?;
    if file.exists() {
        fs::remove_file(file).map_err(|_| "Could not sign out of ChatGPT.")?;
    }
    let mut session = state.lock().map_err(|_| "Tutor state is unavailable.")?;
    session.authorization_url = None;
    emit(&app, TutorEvent::SignedOut);
    Ok(())
}

#[tauri::command]
fn cancel_tutor_request(state: tauri::State<'_, Arc<Mutex<Session>>>) {
    if let Ok(session) = state.lock() {
        if let Some(cancel) = &session.active {
            cancel.cancel();
        }
    }
}

enum StreamFailure {
    Cancelled,
    Provider,
}

async fn consume_stream<F>(
    request: F,
    cancel: CancellationToken,
) -> Result<Vec<String>, StreamFailure>
where
    F: Future<Output = Result<StreamingCompletionResponse, rig_core::completion::CompletionError>>,
{
    tokio::pin!(request);
    let mut response = tokio::select! {
        _ = cancel.cancelled() => return Err(StreamFailure::Cancelled),
        response = &mut request => response.map_err(|_| StreamFailure::Provider)?,
    };
    loop {
        tokio::select! {
            _ = cancel.cancelled() => return Err(StreamFailure::Cancelled),
            chunk = response.next() => match chunk {
                Some(Ok(_)) => {}
                Some(Err(_)) => return Err(StreamFailure::Provider),
                None => break,
            }
        }
    }
    Ok(response
        .choice
        .into_iter()
        .filter_map(|content| match content {
            AssistantContent::Text(text) => Some(text.text),
            _ => None,
        })
        .collect())
}

#[tauri::command]
async fn send_opencode_prompt(
    app: AppHandle,
    state: tauri::State<'_, Arc<Mutex<Session>>>,
    prompt: String,
) -> Result<(), String> {
    if prompt.trim().is_empty() {
        return Err("Enter a tutor prompt before sending.".into());
    }
    let key = state
        .lock()
        .map_err(|_| "Tutor state is unavailable.")?
        .opencode_key
        .clone()
        .ok_or("Connect OpenCode Zen before sending a prompt.")?;
    let opencode_session = state
        .lock()
        .map_err(|_| "Tutor state is unavailable.")?
        .opencode_session
        .clone();
    let cancel = begin_request(&state)?;
    let app_for_task = app.clone();
    let session = state.inner().clone();
    tauri::async_runtime::spawn(async move {
        emit(
            &app_for_task,
            TutorEvent::Status {
                message: format!("Streaming from OpenCode Zen ({ZEN_FREE_MODEL})."),
            },
        );
        let mut headers = http::HeaderMap::new();
        let session_header = match http::HeaderValue::from_str(&opencode_session) {
            Ok(value) => value,
            Err(_) => {
                emit_stream_outcome(
                    &app_for_task,
                    Err(StreamFailure::Provider),
                    "OpenCode request failed",
                );
                finish_request(&session);
                return;
            }
        };
        headers.insert("x-opencode-session", session_header);
        let outcome = match openai::Client::builder()
            .api_key(key)
            .base_url(ZEN_BASE_URL)
            .http_headers(headers)
            .build()
        {
            Ok(client) => {
                let model = client.completions_api().completion_model(ZEN_FREE_MODEL);
                consume_stream(
                    model.stream(model.completion_request(prompt).build()),
                    cancel,
                )
                .await
            }
            Err(_) => Err(StreamFailure::Provider),
        };
        emit_stream_outcome(&app_for_task, outcome, "OpenCode request failed");
        finish_request(&session);
    });
    Ok(())
}

#[tauri::command]
async fn send_chatgpt_prompt(
    app: AppHandle,
    state: tauri::State<'_, Arc<Mutex<Session>>>,
    prompt: String,
) -> Result<(), String> {
    if prompt.trim().is_empty() {
        return Err("Enter a tutor prompt before sending.".into());
    }
    let auth_file = auth_file(&app)?;
    let cancel = begin_request(&state)?;
    let app_for_task = app.clone();
    let session = state.inner().clone();
    tauri::async_runtime::spawn(async move {
        emit(
            &app_for_task,
            TutorEvent::Status {
                message: format!("Streaming from ChatGPT/Codex ({CODEX_MODEL})."),
            },
        );
        let outcome = match chatgpt::Client::builder()
            .oauth()
            .auth_file(auth_file)
            .allow_device_flow(false)
            .build()
        {
            Ok(client) => {
                let model = client.completion_model(CODEX_MODEL);
                consume_stream(
                    model.stream(model.completion_request(prompt).build()),
                    cancel,
                )
                .await
            }
            Err(_) => Err(StreamFailure::Provider),
        };
        emit_stream_outcome(&app_for_task, outcome, "ChatGPT request failed");
        finish_request(&session);
    });
    Ok(())
}

fn emit_stream_outcome(
    app: &AppHandle,
    outcome: Result<Vec<String>, StreamFailure>,
    context: &str,
) {
    match outcome {
        Ok(texts) => {
            for text in texts {
                emit(app, TutorEvent::Text { text });
            }
            emit(app, TutorEvent::Complete);
        }
        Err(StreamFailure::Cancelled) => emit(app, TutorEvent::Cancelled),
        Err(StreamFailure::Provider) => emit(app, safe_error(context)),
    }
}

fn main() {
    tauri::Builder::default()
        .manage(Arc::new(Mutex::new(Session::default())))
        .invoke_handler(tauri::generate_handler![
            connect_opencode,
            begin_chatgpt_sign_in,
            open_chatgpt_authorization_url,
            sign_out_chatgpt,
            cancel_tutor_request,
            send_opencode_prompt,
            send_chatgpt_prompt
        ])
        .run(tauri::generate_context!())
        .expect("Tauri application failed");
}
