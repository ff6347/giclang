// ABOUTME: Owns Codex device authorization outside the webview.
// ABOUTME: Emits redacted device instructions and persists tokens through CredentialStore.

use crate::credentials::CredentialStore;
use base64::{prelude::BASE64_URL_SAFE_NO_PAD, Engine};
use serde::{Deserialize, Serialize};
use std::{sync::Mutex, time::Duration};
use tauri::{AppHandle, Emitter, State};
use tokio_util::sync::CancellationToken;

const AUTH_EVENT: &str = "codex-auth-event";
const CLIENT_ID: &str = "app_EMoamEEZ73f0CkXaXp7hrann";
const DEVICE_CODE_URL: &str = "https://auth.openai.com/api/accounts/deviceauth/usercode";
const DEVICE_TOKEN_URL: &str = "https://auth.openai.com/api/accounts/deviceauth/token";
const OAUTH_TOKEN_URL: &str = "https://auth.openai.com/oauth/token";
const VERIFY_URL: &str = "https://auth.openai.com/codex/device";

pub(crate) struct CodexAuth {
    cancellation: Mutex<Option<CancellationToken>>,
}

impl Default for CodexAuth {
    fn default() -> Self {
        Self {
            cancellation: Mutex::new(None),
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub(crate) enum CodexAuthEvent {
    DeviceAuthorization { url: String, user_code: String },
    Complete,
    Cancelled,
    Error { message: String },
}

impl CodexAuth {
    fn begin(&self) -> Result<CancellationToken, String> {
        let mut active = self
            .cancellation
            .lock()
            .map_err(|_| "Codex sign-in is unavailable.".to_owned())?;
        if let Some(previous) = active.replace(CancellationToken::new()) {
            previous.cancel();
        }
        Ok(active.as_ref().expect("new token is active").clone())
    }

    fn finish(&self, cancellation: &CancellationToken) {
        if let Ok(mut active) = self.cancellation.lock() {
            if active
                .as_ref()
                .is_some_and(|current| current == cancellation)
            {
                *active = None;
            }
        }
    }

    #[cfg(test)]
    pub(crate) fn device_authorization_for_test(url: &str, user_code: &str) -> CodexAuthEvent {
        CodexAuthEvent::DeviceAuthorization {
            url: url.to_owned(),
            user_code: user_code.to_owned(),
        }
    }
}

#[derive(Deserialize)]
struct DeviceCode {
    device_auth_id: String,
    #[serde(alias = "usercode")]
    user_code: String,
    #[serde(default, alias = "verification_url")]
    verification_uri: Option<String>,
    #[serde(default, deserialize_with = "optional_interval")]
    interval: Option<u64>,
}

#[derive(Deserialize)]
struct DeviceToken {
    authorization_code: String,
    code_verifier: String,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: String,
    id_token: Option<String>,
}

#[tauri::command]
pub(crate) async fn start_codex_login(
    app: AppHandle,
    credentials: State<'_, CredentialStore>,
    auth: State<'_, CodexAuth>,
) -> Result<(), String> {
    let cancellation = auth.begin()?;
    let outcome = device_login(&app, &credentials, cancellation.clone()).await;
    match outcome {
        Ok(()) => emit(&app, CodexAuthEvent::Complete),
        Err(LoginError::Cancelled) => emit(&app, CodexAuthEvent::Cancelled),
        Err(LoginError::Failed) => emit(
            &app,
            CodexAuthEvent::Error {
                message: "Codex sign-in could not finish. Check your connection and try again."
                    .to_owned(),
            },
        ),
    }
    auth.finish(&cancellation);
    Ok(())
}

#[tauri::command]
pub(crate) fn cancel_codex_login(auth: State<'_, CodexAuth>) -> Result<(), String> {
    if let Some(cancellation) = auth
        .cancellation
        .lock()
        .map_err(|_| "Codex sign-in is unavailable.".to_owned())?
        .as_ref()
    {
        cancellation.cancel();
    }
    Ok(())
}

fn emit(app: &AppHandle, event: CodexAuthEvent) {
    let _ = app.emit(AUTH_EVENT, event);
}

enum LoginError {
    Cancelled,
    Failed,
}

async fn device_login(
    app: &AppHandle,
    credentials: &CredentialStore,
    cancellation: CancellationToken,
) -> Result<(), LoginError> {
    let client = reqwest::Client::new();
    let device = client
        .post(DEVICE_CODE_URL)
        .json(&serde_json::json!({ "client_id": CLIENT_ID }))
        .send()
        .await
        .map_err(|_| LoginError::Failed)?
        .error_for_status()
        .map_err(|_| LoginError::Failed)?
        .json::<DeviceCode>()
        .await
        .map_err(|_| LoginError::Failed)?;
    emit(
        app,
        CodexAuthEvent::DeviceAuthorization {
            url: device
                .verification_uri
                .unwrap_or_else(|| VERIFY_URL.to_owned()),
            user_code: device.user_code.clone(),
        },
    );
    let interval = Duration::from_secs(device.interval.unwrap_or(5));
    let code = loop {
        if cancellation.is_cancelled() {
            return Err(LoginError::Cancelled);
        }
        let response = client
            .post(DEVICE_TOKEN_URL)
            .json(&serde_json::json!({
                "device_auth_id": device.device_auth_id,
                "user_code": device.user_code,
            }))
            .send()
            .await
            .map_err(|_| LoginError::Failed)?;
        if response.status().is_success() {
            break response
                .json::<DeviceToken>()
                .await
                .map_err(|_| LoginError::Failed)?;
        }
        if !matches!(response.status().as_u16(), 403 | 404) {
            return Err(LoginError::Failed);
        }
        tokio::select! {
            _ = cancellation.cancelled() => return Err(LoginError::Cancelled),
            _ = tokio::time::sleep(interval) => {}
        }
    };
    let tokens = client
        .post(OAUTH_TOKEN_URL)
        .form(&[
            ("grant_type", "authorization_code"),
            ("code", code.authorization_code.as_str()),
            (
                "redirect_uri",
                "https://auth.openai.com/deviceauth/callback",
            ),
            ("client_id", CLIENT_ID),
            ("code_verifier", code.code_verifier.as_str()),
        ])
        .send()
        .await
        .map_err(|_| LoginError::Failed)?
        .error_for_status()
        .map_err(|_| LoginError::Failed)?
        .json::<TokenResponse>()
        .await
        .map_err(|_| LoginError::Failed)?;
    let account = tokens
        .id_token
        .as_deref()
        .and_then(account_id)
        .or_else(|| account_id(&tokens.access_token))
        .ok_or(LoginError::Failed)?;
    credentials
        .authenticate_codex(&tokens.access_token, &tokens.refresh_token, &account)
        .map_err(|_| LoginError::Failed)
}

fn optional_interval<'de, D>(deserializer: D) -> Result<Option<u64>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Value {
        Number(u64),
        String(String),
    }
    Option::<Value>::deserialize(deserializer)?
        .map(|value| match value {
            Value::Number(value) => Ok(value),
            Value::String(value) => value.parse().map_err(serde::de::Error::custom),
        })
        .transpose()
}

fn account_id(token: &str) -> Option<String> {
    token
        .split('.')
        .nth(1)
        .and_then(|payload| BASE64_URL_SAFE_NO_PAD.decode(payload).ok())
        .and_then(|payload| serde_json::from_slice::<serde_json::Value>(&payload).ok())
        .and_then(|claims| {
            claims
                .get("https://api.openai.com/auth")?
                .get("chatgpt_account_id")?
                .as_str()
                .map(str::to_owned)
        })
}
