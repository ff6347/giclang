//! Privileged application boundary: credentials never enter the webview.

use gic_tutor_spike_core::{DeterministicProvider, TutorEvent, submit};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};
use tokio_util::sync::CancellationToken;

const ZEN_FREE_MODEL: &str = "mimo-v2.5-free";
const CODEX_MODEL: &str = "gpt-5.3-instant";

#[derive(Default)]
struct Session {
    // Zen credentials are memory-only and never serialized.
    opencode_key: Option<String>,
    active: Option<CancellationToken>,
    authorization_url: Option<String>,
}

fn emit(app: &AppHandle, event: TutorEvent) {
    let _ = app.emit("gic:tutor-event", event);
}

/// The sole command accepting a key. It never returns or persists the key.
#[tauri::command]
fn connect_opencode(
    state: tauri::State<'_, Mutex<Session>>,
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
    state: tauri::State<'_, Mutex<Session>>,
) -> Result<(), String> {
    // Renderer input cannot influence the URL; this is not a generic opener.
    let url = "https://auth.openai.com/codex/device".to_string();
    state
        .lock()
        .map_err(|_| "Tutor state is unavailable.")?
        .authorization_url = Some(url.clone());
    emit(
        &app,
        TutorEvent::DeviceAuthorization {
            url,
            user_code: "Authorization starts when you send.".into(),
        },
    );
    Ok(())
}

#[tauri::command]
fn open_chatgpt_authorization_url(state: tauri::State<'_, Mutex<Session>>) -> Result<(), String> {
    let url = state
        .lock()
        .map_err(|_| "Tutor state is unavailable.")?
        .authorization_url
        .clone()
        .ok_or("Start ChatGPT sign-in first.")?;
    open::that_detached(url).map_err(|_| "Could not open the ChatGPT authorization page.".into())
}

#[tauri::command]
fn sign_out_chatgpt(app: AppHandle, state: tauri::State<'_, Mutex<Session>>) -> Result<(), String> {
    state
        .lock()
        .map_err(|_| "Tutor state is unavailable.")?
        .authorization_url = None;
    emit(&app, TutorEvent::SignedOut);
    Ok(())
}

#[tauri::command]
fn cancel_tutor_request(state: tauri::State<'_, Mutex<Session>>) {
    if let Ok(mut session) = state.lock() {
        if let Some(cancel) = session.active.take() {
            cancel.cancel();
        }
    }
}

async fn submit_deterministic(
    app: AppHandle,
    state: tauri::State<'_, Mutex<Session>>,
    prompt: String,
    provider: &str,
) -> Result<(), String> {
    if prompt.trim().is_empty() {
        return Err("Enter a tutor prompt before sending.".into());
    }
    let cancel = CancellationToken::new();
    state
        .lock()
        .map_err(|_| "Tutor state is unavailable.")?
        .active = Some(cancel.clone());
    emit(
        &app,
        TutorEvent::Status {
            message: format!("Streaming from {provider}."),
        },
    );
    let mut forward = |event| emit(&app, event);
    submit(&DeterministicProvider, prompt, cancel, &mut forward).await;
    Ok(())
}

#[tauri::command]
async fn send_opencode_prompt(
    app: AppHandle,
    state: tauri::State<'_, Mutex<Session>>,
    prompt: String,
) -> Result<(), String> {
    if state
        .lock()
        .map_err(|_| "Tutor state is unavailable.")?
        .opencode_key
        .is_none()
    {
        return Err("Connect OpenCode Zen before sending a prompt.".into());
    }
    submit_deterministic(
        app,
        state,
        prompt,
        &format!("OpenCode Zen ({ZEN_FREE_MODEL})"),
    )
    .await
}

#[tauri::command]
async fn send_chatgpt_prompt(
    app: AppHandle,
    state: tauri::State<'_, Mutex<Session>>,
    prompt: String,
) -> Result<(), String> {
    submit_deterministic(
        app,
        state,
        prompt,
        &format!("ChatGPT/Codex ({CODEX_MODEL})"),
    )
    .await
}

fn main() {
    tauri::Builder::default()
        .manage(Mutex::new(Session::default()))
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
