//! Privileged application boundary: credentials and Rig stay out of the webview.

mod chatgpt_auth;

use chatgpt_auth::ChatGptAuth;
use futures_util::StreamExt;
use gic_tutor_spike_core::{AgentEvent, RequestGate, provider_diagnostic, safe_error};
use rig_core::{
    client::CompletionClient,
    completion::{CompletionError, CompletionModel},
    providers::{chatgpt, openai},
    streaming::{StreamedAssistantContent, StreamingCompletionResponse},
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
const CODEX_MODEL: &str = "gpt-5.6-luna";
const ZEN_BASE_URL: &str = "https://opencode.ai/zen/v1";
const CHATGPT_AUTH_FILE: &str = "chatgpt-auth.json";

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

fn emit(app: &AppHandle, event: AgentEvent) {
    let _ = app.emit("gic:agent-event", event);
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
    let mut session = state.lock().map_err(|_| "Agent state is unavailable.")?;
    if !session.gate.begin() {
        return Err("An agent request is already in progress.".into());
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
        .map_err(|_| "Agent state is unavailable.")?
        .opencode_key = Some(api_key);
    Ok(())
}

#[tauri::command]
fn begin_chatgpt_sign_in(
    app: AppHandle,
    state: tauri::State<'_, Arc<Mutex<Session>>>,
) -> Result<(), String> {
    let auth = ChatGptAuth::new(auth_file(&app)?);
    let cancel = begin_request(&state)?;
    let app_for_task = app.clone();
    let session = state.inner().clone();
    tauri::async_runtime::spawn(async move {
        emit(
            &app_for_task,
            AgentEvent::Status {
                message: "Starting ChatGPT device authorization.".into(),
            },
        );
        let callback_app = app_for_task.clone();
        let callback_state = session.clone();
        let result = auth
            .sign_in(cancel, move |prompt| {
                if let Ok(mut session) = callback_state.lock() {
                    session.authorization_url = Some(prompt.verification_url.clone());
                }
                emit(
                    &callback_app,
                    AgentEvent::DeviceAuthorization {
                        url: prompt.verification_url,
                        user_code: prompt.user_code,
                    },
                );
            })
            .await;
        match result {
            Ok(()) => emit(&app_for_task, AgentEvent::SignedIn),
            Err(error) => emit(
                &app_for_task,
                AgentEvent::Error {
                    message: error.message().into(),
                },
            ),
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
        .map_err(|_| "Agent state is unavailable.")?
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
    ChatGptAuth::new(auth_file(&app)?)
        .sign_out()
        .map_err(|_| "Could not sign out of ChatGPT.")?;
    let mut session = state.lock().map_err(|_| "Agent state is unavailable.")?;
    session.authorization_url = None;
    emit(&app, AgentEvent::SignedOut);
    Ok(())
}

#[tauri::command]
fn cancel_agent_request(state: tauri::State<'_, Arc<Mutex<Session>>>) {
    if let Ok(session) = state.lock() {
        if let Some(cancel) = &session.active {
            cancel.cancel();
        }
    }
}

enum StreamFailure {
    Cancelled,
    Provider(String),
}

fn completion_failure(provider: &str, error: CompletionError) -> StreamFailure {
    let category = match &error {
        CompletionError::HttpError(_) => "HTTP transport or provider response",
        CompletionError::JsonError(_) => "JSON encoding or decoding",
        CompletionError::UrlError(_) => "request URL",
        CompletionError::RequestError(_) => "request construction",
        CompletionError::ResponseError(_) => "response parsing",
        CompletionError::ProviderError(_) => "provider stream",
        CompletionError::ProviderResponse(_) => "provider response",
    };
    let fallback_response = match &error {
        CompletionError::ResponseError(message) | CompletionError::ProviderError(message) => {
            Some(message.as_str())
        }
        _ => None,
    };
    StreamFailure::Provider(provider_diagnostic(
        provider,
        category,
        error
            .provider_response_status()
            .map(|status| status.as_u16()),
        error.provider_response_body().or(fallback_response),
    ))
}

async fn consume_stream<F>(
    request: F,
    cancel: CancellationToken,
    app: &AppHandle,
    provider: &str,
) -> Result<(), StreamFailure>
where
    F: Future<Output = Result<StreamingCompletionResponse, rig_core::completion::CompletionError>>,
{
    tokio::pin!(request);
    let mut response = tokio::select! {
        _ = cancel.cancelled() => return Err(StreamFailure::Cancelled),
        response = &mut request => response.map_err(|error| completion_failure(provider, error))?,
    };
    loop {
        tokio::select! {
            _ = cancel.cancelled() => return Err(StreamFailure::Cancelled),
            chunk = response.next() => match chunk {
                Some(Ok(StreamedAssistantContent::Text(text))) => {
                    emit(app, AgentEvent::Text { text: text.text });
                }
                Some(Ok(_)) => {}
                Some(Err(error)) => return Err(completion_failure(provider, error)),
                None => break,
            }
        }
    }
    Ok(())
}

#[tauri::command]
async fn send_opencode_prompt(
    app: AppHandle,
    state: tauri::State<'_, Arc<Mutex<Session>>>,
    prompt: String,
) -> Result<(), String> {
    if prompt.trim().is_empty() {
        return Err("Enter an agent prompt before sending.".into());
    }
    let key = state
        .lock()
        .map_err(|_| "Agent state is unavailable.")?
        .opencode_key
        .clone()
        .ok_or("Connect OpenCode Zen before sending a prompt.")?;
    let opencode_session = state
        .lock()
        .map_err(|_| "Agent state is unavailable.")?
        .opencode_session
        .clone();
    let cancel = begin_request(&state)?;
    let app_for_task = app.clone();
    let session = state.inner().clone();
    tauri::async_runtime::spawn(async move {
        emit(
            &app_for_task,
            AgentEvent::Status {
                message: format!("Streaming from OpenCode Zen ({ZEN_FREE_MODEL})."),
            },
        );
        let mut headers = http::HeaderMap::new();
        let session_header = match http::HeaderValue::from_str(&opencode_session) {
            Ok(value) => value,
            Err(_) => {
                emit_stream_outcome(
                    &app_for_task,
                    Err(StreamFailure::Provider(
                        "OpenCode Zen: invalid session header".into(),
                    )),
                    "OpenCode request failed",
                );
                finish_request(&session);
                return;
            }
        };
        headers.insert("x-opencode-session", session_header);
        headers.insert(
            http::header::USER_AGENT,
            http::HeaderValue::from_static("gic-agent-spike/0.0.0"),
        );
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
                    &app_for_task,
                    "OpenCode Zen",
                )
                .await
            }
            Err(_) => Err(StreamFailure::Provider(
                "OpenCode Zen: client construction failed".into(),
            )),
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
        return Err("Enter an agent prompt before sending.".into());
    }
    let auth_file = auth_file(&app)?;
    let cancel = begin_request(&state)?;
    let app_for_task = app.clone();
    let session = state.inner().clone();
    tauri::async_runtime::spawn(async move {
        emit(
            &app_for_task,
            AgentEvent::Status {
                message: format!("Streaming from ChatGPT/Codex ({CODEX_MODEL})."),
            },
        );
        // Refresh/load remains in the app-owned auth port. Rig is used only
        // after Send, with the non-persisted access context it returns.
        let outcome = match ChatGptAuth::new(auth_file).context().await {
            Ok(auth) => {
                emit(
                    &app_for_task,
                    AgentEvent::Diagnostic {
                        message: format!(
                            "ChatGPT: preparing Rig request; model={CODEX_MODEL}; endpoint=/backend-api/codex/responses; account ID present={}",
                            auth.account_id.is_some()
                        ),
                    },
                );
                match chatgpt::Client::builder()
                    .api_key(chatgpt::ChatGPTAuth::AccessToken {
                        access_token: auth.access_token,
                        account_id: auth.account_id,
                    })
                    .build()
                {
                    Ok(client) => {
                        let model = client.completion_model(CODEX_MODEL);
                        consume_stream(
                            model.stream(model.completion_request(prompt).build()),
                            cancel,
                            &app_for_task,
                            "ChatGPT",
                        )
                        .await
                    }
                    Err(_) => Err(StreamFailure::Provider(
                        "ChatGPT: Rig client construction failed".into(),
                    )),
                }
            }
            Err(_) => Err(StreamFailure::Provider(
                "ChatGPT: saved authentication context could not be loaded or refreshed".into(),
            )),
        };
        emit_stream_outcome(&app_for_task, outcome, "ChatGPT request failed");
        finish_request(&session);
    });
    Ok(())
}

fn emit_stream_outcome(app: &AppHandle, outcome: Result<(), StreamFailure>, context: &str) {
    match outcome {
        Ok(()) => emit(app, AgentEvent::Complete),
        Err(StreamFailure::Cancelled) => emit(app, AgentEvent::Cancelled),
        Err(StreamFailure::Provider(diagnostic)) => {
            emit(
                app,
                AgentEvent::Diagnostic {
                    message: diagnostic,
                },
            );
            emit(app, safe_error(context));
        }
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
            cancel_agent_request,
            send_opencode_prompt,
            send_chatgpt_prompt
        ])
        .run(tauri::generate_context!())
        .expect("Tauri application failed");
}
