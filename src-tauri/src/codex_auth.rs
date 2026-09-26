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
const VERIFY_URL: &str = "https://auth.openai.com/codex/device";

#[derive(Clone)]
struct Endpoints {
    device_code: String,
    device_token: String,
    oauth_token: String,
}

impl Endpoints {
    fn production() -> Self {
        Self {
            device_code: "https://auth.openai.com/api/accounts/deviceauth/usercode".to_owned(),
            device_token: "https://auth.openai.com/api/accounts/deviceauth/token".to_owned(),
            oauth_token: "https://auth.openai.com/oauth/token".to_owned(),
        }
    }
}

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

#[derive(Debug)]
enum LoginError {
    Cancelled,
    Failed,
}

struct AuthorizedTokens {
    access_token: String,
    refresh_token: String,
    account_id: String,
}

async fn device_login(
    app: &AppHandle,
    credentials: &CredentialStore,
    cancellation: CancellationToken,
) -> Result<(), LoginError> {
    let client = reqwest::Client::new();
    let tokens = authorize(
        &client,
        &Endpoints::production(),
        cancellation,
        |url, user_code| {
            emit(app, CodexAuthEvent::DeviceAuthorization { url, user_code });
        },
    )
    .await?;
    credentials
        .authenticate_codex(
            &tokens.access_token,
            &tokens.refresh_token,
            &tokens.account_id,
        )
        .map_err(|_| LoginError::Failed)
}

async fn authorize(
    client: &reqwest::Client,
    endpoints: &Endpoints,
    cancellation: CancellationToken,
    present: impl FnOnce(String, String),
) -> Result<AuthorizedTokens, LoginError> {
    let device = client
        .post(&endpoints.device_code)
        .json(&serde_json::json!({ "client_id": CLIENT_ID }))
        .send()
        .await
        .map_err(|_| LoginError::Failed)?
        .error_for_status()
        .map_err(|_| LoginError::Failed)?
        .json::<DeviceCode>()
        .await
        .map_err(|_| LoginError::Failed)?;
    present(
        device
            .verification_uri
            .unwrap_or_else(|| VERIFY_URL.to_owned()),
        device.user_code.clone(),
    );
    let interval = Duration::from_secs(device.interval.unwrap_or(5));
    let code = loop {
        if cancellation.is_cancelled() {
            return Err(LoginError::Cancelled);
        }
        let response = client
            .post(&endpoints.device_token)
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
        .post(&endpoints.oauth_token)
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
    Ok(AuthorizedTokens {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        account_id: account,
    })
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

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::{
        io::{AsyncReadExt, AsyncWriteExt},
        net::TcpListener,
    };

    async fn server(responses: [&str; 3]) -> (Endpoints, tokio::task::JoinHandle<Vec<String>>) {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let responses = responses.map(str::to_owned);
        let server = tokio::spawn(async move {
            let mut requests = Vec::new();
            for response in responses {
                let (mut socket, _) = listener.accept().await.unwrap();
                let mut data = Vec::new();
                let mut incoming = [0; 1024];
                loop {
                    let count = socket.read(&mut incoming).await.unwrap();
                    data.extend_from_slice(&incoming[..count]);
                    if data.windows(4).any(|window| window == b"\r\n\r\n") {
                        break;
                    }
                }
                requests.push(String::from_utf8_lossy(&data).to_string());
                socket
                    .write_all(
                        format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                            response.len(),
                            response
                        )
                        .as_bytes(),
                    )
                    .await
                    .unwrap();
            }
            requests
        });
        let base = format!("http://{address}");
        (
            Endpoints {
                device_code: format!("{base}/device"),
                device_token: format!("{base}/poll"),
                oauth_token: format!("{base}/token"),
            },
            server,
        )
    }

    #[tokio::test]
    async fn device_flow_polls_exchanges_and_never_sends_tokens_to_presenter() {
        let (endpoints, server) = server([
            r#"{"device_auth_id":"device","user_code":"ABCD","verification_uri":"https://auth.example/device","interval":"0"}"#,
            r#"{"authorization_code":"code","code_verifier":"verifier"}"#,
            r#"{"access_token":"x.eyJodHRwczovL2FwaS5vcGVuYWkuY29tL2F1dGgiOnsiY2hhdGdwdF9hY2NvdW50X2lkIjoiYWNjb3VudCJ9fQ.x","refresh_token":"synthetic-refresh"}"#,
        ]).await;
        let mut presented = None;
        let tokens = authorize(
            &reqwest::Client::new(),
            &endpoints,
            CancellationToken::new(),
            |url, user_code| presented = Some((url, user_code)),
        )
        .await
        .unwrap();

        assert_eq!(
            presented,
            Some(("https://auth.example/device".to_owned(), "ABCD".to_owned()))
        );
        assert_eq!(tokens.account_id, "account");
        assert_eq!(tokens.access_token, "x.eyJodHRwczovL2FwaS5vcGVuYWkuY29tL2F1dGgiOnsiY2hhdGdwdF9hY2NvdW50X2lkIjoiYWNjb3VudCJ9fQ.x");
        assert_eq!(tokens.refresh_token, "synthetic-refresh");
        let requests = server.await.unwrap();
        assert!(requests
            .iter()
            .all(|request| !request.contains("synthetic-refresh")));
        assert!(requests
            .iter()
            .all(|request| !request.contains("/responses")));
    }
}
