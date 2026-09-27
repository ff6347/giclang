// ABOUTME: Owns Codex device authorization outside the webview.
// ABOUTME: Emits redacted device instructions and persists tokens through CredentialStore.

use crate::credentials::CredentialStore;
use base64::{prelude::BASE64_URL_SAFE_NO_PAD, Engine};
use serde::{Deserialize, Serialize};
use std::{
    future::Future,
    sync::Mutex,
    time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter, State};
use tokio_util::sync::CancellationToken;

const AUTH_EVENT: &str = "codex-auth-event";
pub(crate) const CLIENT_ID: &str = "app_EMoamEEZ73f0CkXaXp7hrann";
pub(crate) const OAUTH_TOKEN_URL: &str = "https://auth.openai.com/oauth/token";
pub(crate) const VERIFY_URL: &str = "https://auth.openai.com/codex/device";
const AUTHORIZATION_TIMEOUT: Duration = Duration::from_secs(10 * 60);

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
            oauth_token: OAUTH_TOKEN_URL.to_owned(),
        }
    }
}

pub(crate) struct CodexAuth {
    login: Mutex<LoginState>,
}

struct LoginState {
    next_attempt_id: u64,
    active: Option<LoginAttempt>,
}

#[derive(Clone)]
struct LoginAttempt {
    id: u64,
    cancellation: CancellationToken,
}

impl Default for CodexAuth {
    fn default() -> Self {
        Self {
            login: Mutex::new(LoginState {
                next_attempt_id: 1,
                active: None,
            }),
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
    DeviceAuthorization {
        attempt_id: u64,
        url: String,
        user_code: String,
    },
    Complete {
        attempt_id: u64,
    },
    Cancelled {
        attempt_id: u64,
    },
    Error {
        attempt_id: u64,
        message: String,
    },
}

impl CodexAuth {
    fn begin(&self) -> Result<LoginAttempt, String> {
        let mut login = self
            .login
            .lock()
            .map_err(|_| "Codex sign-in is unavailable.".to_owned())?;
        let next = LoginAttempt {
            id: login.next_attempt_id,
            cancellation: CancellationToken::new(),
        };
        login.next_attempt_id += 1;
        if let Some(previous) = login.active.replace(next) {
            previous.cancellation.cancel();
        }
        Ok(login.active.as_ref().expect("new login is active").clone())
    }

    fn finish(&self, attempt: &LoginAttempt) {
        if let Ok(mut login) = self.login.lock() {
            if login
                .active
                .as_ref()
                .is_some_and(|active| active.id == attempt.id)
            {
                login.active = None;
            }
        }
    }

    pub(crate) fn cancel(&self) -> Result<(), String> {
        if let Some(active) = self
            .login
            .lock()
            .map_err(|_| "Codex sign-in is unavailable.".to_owned())?
            .active
            .as_ref()
        {
            active.cancellation.cancel();
        }
        Ok(())
    }

    pub(crate) fn sign_out(&self, credentials: &CredentialStore) -> Result<(), String> {
        let mut login = self
            .login
            .lock()
            .map_err(|_| "Codex sign-in is unavailable.".to_owned())?;
        if let Some(active) = login.active.take() {
            active.cancellation.cancel();
        }
        credentials.sign_out_codex()
    }

    fn persist_if_current(
        &self,
        credentials: &CredentialStore,
        attempt: &LoginAttempt,
        tokens: &AuthorizedTokens,
    ) -> Result<bool, LoginError> {
        let login = self.login.lock().map_err(|_| LoginError::Failed)?;
        if login
            .active
            .as_ref()
            .is_none_or(|active| active.id != attempt.id || active.cancellation.is_cancelled())
        {
            return Ok(false);
        }
        credentials
            .authenticate_codex(
                &tokens.access_token,
                &tokens.refresh_token,
                &tokens.account_id,
            )
            .map_err(|_| LoginError::Failed)?;
        Ok(true)
    }

    fn emit_if_current(&self, app: &AppHandle, attempt: &LoginAttempt, event: CodexAuthEvent) {
        if let Ok(login) = self.login.lock() {
            if login
                .active
                .as_ref()
                .is_some_and(|active| active.id == attempt.id)
            {
                emit(app, event);
            }
        }
    }

    #[cfg(test)]
    pub(crate) fn device_authorization_for_test(url: &str, user_code: &str) -> CodexAuthEvent {
        CodexAuthEvent::DeviceAuthorization {
            attempt_id: 1,
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
    let attempt = auth.begin()?;
    let outcome = device_login(&app, &credentials, &auth, &attempt).await;
    match outcome {
        Ok(()) => auth.emit_if_current(
            &app,
            &attempt,
            CodexAuthEvent::Complete {
                attempt_id: attempt.id,
            },
        ),
        Err(LoginError::Cancelled) => auth.emit_if_current(
            &app,
            &attempt,
            CodexAuthEvent::Cancelled {
                attempt_id: attempt.id,
            },
        ),
        Err(error) => auth.emit_if_current(
            &app,
            &attempt,
            CodexAuthEvent::Error {
                attempt_id: attempt.id,
                message: error.message().to_owned(),
            },
        ),
    }
    auth.finish(&attempt);
    Ok(())
}

#[tauri::command]
pub(crate) fn cancel_codex_login(auth: State<'_, CodexAuth>) -> Result<(), String> {
    auth.cancel()
}

fn emit(app: &AppHandle, event: CodexAuthEvent) {
    let _ = app.emit(AUTH_EVENT, event);
}

#[derive(Debug)]
enum LoginError {
    Cancelled,
    Expired,
    Denied,
    Revoked,
    Offline,
    Failed,
}

impl LoginError {
    fn message(&self) -> &'static str {
        match self {
            Self::Cancelled => "Codex sign-in was cancelled.",
            Self::Expired => "Codex authorization expired. Sign in again.",
            Self::Denied => "Codex authorization was denied. Sign in again.",
            Self::Revoked => "Codex authorization was revoked. Sign in again.",
            Self::Offline => {
                "Codex sign-in could not reach ChatGPT. Check your connection and try again."
            }
            Self::Failed => "Codex sign-in could not finish. Check your connection and try again.",
        }
    }
}

struct AuthorizedTokens {
    access_token: String,
    refresh_token: String,
    account_id: String,
}

async fn device_login(
    app: &AppHandle,
    credentials: &CredentialStore,
    auth: &CodexAuth,
    attempt: &LoginAttempt,
) -> Result<(), LoginError> {
    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(30))
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|_| LoginError::Failed)?;
    let tokens = authorize(
        &client,
        &Endpoints::production(),
        attempt.cancellation.clone(),
        |url, user_code| {
            auth.emit_if_current(
                app,
                attempt,
                CodexAuthEvent::DeviceAuthorization {
                    attempt_id: attempt.id,
                    url,
                    user_code,
                },
            );
        },
    )
    .await?;
    auth.persist_if_current(credentials, attempt, &tokens)?
        .then_some(())
        .ok_or(LoginError::Cancelled)
}

async fn authorize(
    client: &reqwest::Client,
    endpoints: &Endpoints,
    cancellation: CancellationToken,
    present: impl FnOnce(String, String),
) -> Result<AuthorizedTokens, LoginError> {
    authorize_until(
        client,
        endpoints,
        cancellation,
        Instant::now() + AUTHORIZATION_TIMEOUT,
        present,
    )
    .await
}

async fn authorize_until(
    client: &reqwest::Client,
    endpoints: &Endpoints,
    cancellation: CancellationToken,
    deadline: Instant,
    present: impl FnOnce(String, String),
) -> Result<AuthorizedTokens, LoginError> {
    if Instant::now() >= deadline {
        return Err(LoginError::Expired);
    }
    let response = cancellable(
        &cancellation,
        deadline,
        client
            .post(&endpoints.device_code)
            .json(&serde_json::json!({ "client_id": CLIENT_ID }))
            .send(),
    )
    .await?
    .error_for_status()
    .map_err(|_| LoginError::Failed)?;
    let device = cancellable(&cancellation, deadline, response.json::<DeviceCode>()).await?;
    present(
        device
            .verification_uri
            .unwrap_or_else(|| VERIFY_URL.to_owned()),
        device.user_code.clone(),
    );
    let interval = Duration::from_secs(device.interval.unwrap_or(5));
    let code = loop {
        if Instant::now() >= deadline {
            return Err(LoginError::Expired);
        }
        if cancellation.is_cancelled() {
            return Err(LoginError::Cancelled);
        }
        let response = cancellable(
            &cancellation,
            deadline,
            client
                .post(&endpoints.device_token)
                .json(&serde_json::json!({
                    "device_auth_id": device.device_auth_id,
                    "user_code": device.user_code,
                }))
                .send(),
        )
        .await?;
        if response.status().is_success() {
            break cancellable(&cancellation, deadline, response.json::<DeviceToken>()).await?;
        }
        if !matches!(response.status().as_u16(), 403 | 404) {
            return Err(match response.status().as_u16() {
                401 => LoginError::Denied,
                410 => LoginError::Revoked,
                _ => LoginError::Failed,
            });
        }
        tokio::select! {
            _ = cancellation.cancelled() => return Err(LoginError::Cancelled),
            _ = tokio::time::sleep(interval.min(deadline.saturating_duration_since(Instant::now()))) => {}
        }
    };
    let response = cancellable(
        &cancellation,
        deadline,
        client
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
            .send(),
    )
    .await?
    .error_for_status()
    .map_err(|_| LoginError::Failed)?;
    let tokens = cancellable(&cancellation, deadline, response.json::<TokenResponse>()).await?;
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

async fn cancellable<T>(
    cancellation: &CancellationToken,
    deadline: Instant,
    operation: impl Future<Output = Result<T, reqwest::Error>>,
) -> Result<T, LoginError> {
    tokio::select! {
        biased;
        _ = cancellation.cancelled() => Err(LoginError::Cancelled),
        _ = tokio::time::sleep_until(deadline.into()) => Err(LoginError::Expired),
        result = operation => result.map_err(|_| LoginError::Offline),
    }
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

pub(crate) fn account_id(token: &str) -> Option<String> {
    token_claims(token)?
        .get("https://api.openai.com/auth")?
        .get("chatgpt_account_id")?
        .as_str()
        .map(str::to_owned)
}

pub(crate) fn token_claims(token: &str) -> Option<serde_json::Value> {
    token
        .split('.')
        .nth(1)
        .and_then(|payload| BASE64_URL_SAFE_NO_PAD.decode(payload).ok())
        .and_then(|payload| serde_json::from_slice::<serde_json::Value>(&payload).ok())
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
                        let headers = String::from_utf8_lossy(&data);
                        let length = headers
                            .lines()
                            .find_map(|line| line.strip_prefix("content-length:"))
                            .or_else(|| {
                                headers
                                    .lines()
                                    .find_map(|line| line.strip_prefix("Content-Length:"))
                            })
                            .map(|value| value.trim().parse::<usize>().unwrap())
                            .unwrap_or_default();
                        let body_start = data
                            .windows(4)
                            .position(|window| window == b"\r\n\r\n")
                            .unwrap()
                            + 4;
                        if data.len() >= body_start + length {
                            break;
                        }
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
        let requests = requests
            .iter()
            .map(|request| request.replace("\r\n", "\n"))
            .collect::<Vec<_>>();
        assert!(requests[0].starts_with("POST /device HTTP/1.1\n"));
        assert!(requests[0].contains("content-type: application/json\n"));
        assert!(requests[0].ends_with("\n\n{\"client_id\":\"app_EMoamEEZ73f0CkXaXp7hrann\"}"));
        assert!(requests[1].starts_with("POST /poll HTTP/1.1\n"));
        assert!(requests[1].contains("content-type: application/json\n"));
        assert!(requests[1].ends_with("\n\n{\"device_auth_id\":\"device\",\"user_code\":\"ABCD\"}"));
        assert!(requests[2].starts_with("POST /token HTTP/1.1\n"));
        assert!(requests[2].contains("content-type: application/x-www-form-urlencoded\n"));
        assert!(requests[2].ends_with("\n\ngrant_type=authorization_code&code=code&redirect_uri=https%3A%2F%2Fauth.openai.com%2Fdeviceauth%2Fcallback&client_id=app_EMoamEEZ73f0CkXaXp7hrann&code_verifier=verifier"));
    }

    #[tokio::test]
    async fn cancellation_interrupts_a_stalled_device_request() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move {
            let (_socket, _) = listener.accept().await.unwrap();
            std::future::pending::<()>().await;
        });
        let cancellation = CancellationToken::new();
        let cancel = cancellation.clone();
        let login = tokio::spawn(async move {
            authorize(
                &reqwest::Client::new(),
                &Endpoints {
                    device_code: format!("{base}/device"),
                    device_token: format!("{base}/poll"),
                    oauth_token: format!("{base}/token"),
                },
                cancellation,
                |_, _| {},
            )
            .await
        });

        tokio::time::sleep(Duration::from_millis(20)).await;
        cancel.cancel();
        assert!(matches!(
            tokio::time::timeout(Duration::from_millis(100), login)
                .await
                .expect("cancellation must not wait for the network")
                .expect("login task"),
            Err(LoginError::Cancelled)
        ));
        server.abort();
    }

    #[tokio::test]
    async fn authorization_deadline_interrupts_a_stalled_device_request() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move {
            let (_socket, _) = listener.accept().await.unwrap();
            std::future::pending::<()>().await;
        });

        let result = tokio::time::timeout(
            Duration::from_secs(1),
            authorize_until(
                &reqwest::Client::new(),
                &Endpoints {
                    device_code: format!("{base}/device"),
                    device_token: format!("{base}/poll"),
                    oauth_token: format!("{base}/token"),
                },
                CancellationToken::new(),
                Instant::now() + Duration::from_millis(50),
                |_, _| {},
            ),
        )
        .await
        .expect("authorization must not wait indefinitely for the network");
        assert!(matches!(result, Err(LoginError::Expired)));
        server.abort();
    }

    #[test]
    fn superseded_or_cancelled_attempt_cannot_persist_credentials() {
        let directory = tempfile::tempdir().unwrap();
        let credentials = CredentialStore::new(directory.path().join("auth.json"));
        let auth = CodexAuth::default();
        let first = auth.begin().unwrap();
        let second = auth.begin().unwrap();
        let tokens = AuthorizedTokens {
            access_token: "access".to_owned(),
            refresh_token: "refresh".to_owned(),
            account_id: "account".to_owned(),
        };

        assert!(!auth
            .persist_if_current(&credentials, &first, &tokens)
            .unwrap());
        assert!(!credentials.status().unwrap().codex_authenticated);
        auth.cancel().unwrap();
        assert!(!auth
            .persist_if_current(&credentials, &second, &tokens)
            .unwrap());
        assert!(!credentials.status().unwrap().codex_authenticated);
    }

    #[test]
    fn signing_out_invalidates_the_active_login_and_removes_credentials() {
        let directory = tempfile::tempdir().unwrap();
        let credentials = CredentialStore::new(directory.path().join("auth.json"));
        let auth = CodexAuth::default();
        let tokens = AuthorizedTokens {
            access_token: "access".to_owned(),
            refresh_token: "refresh".to_owned(),
            account_id: "account".to_owned(),
        };
        credentials
            .authenticate_codex(
                &tokens.access_token,
                &tokens.refresh_token,
                &tokens.account_id,
            )
            .unwrap();
        let attempt = auth.begin().unwrap();

        auth.sign_out(&credentials).unwrap();

        assert!(!auth
            .persist_if_current(&credentials, &attempt, &tokens)
            .unwrap());
        assert!(!credentials.status().unwrap().codex_authenticated);
        assert!(!directory.path().join("auth.json").exists());
    }

    #[tokio::test]
    async fn authorization_deadline_and_safe_provider_failures_are_actionable() {
        let cancellation = CancellationToken::new();
        let result = authorize_until(
            &reqwest::Client::new(),
            &Endpoints {
                device_code: "http://127.0.0.1:1/device".to_owned(),
                device_token: "http://127.0.0.1:1/poll".to_owned(),
                oauth_token: "http://127.0.0.1:1/token".to_owned(),
            },
            cancellation,
            Instant::now() - Duration::from_secs(1),
            |_, _| {},
        )
        .await;
        assert!(matches!(result, Err(LoginError::Expired)));
        assert_eq!(
            LoginError::Expired.message(),
            "Codex authorization expired. Sign in again."
        );
        assert_eq!(
            LoginError::Denied.message(),
            "Codex authorization was denied. Sign in again."
        );
        assert_eq!(
            LoginError::Revoked.message(),
            "Codex authorization was revoked. Sign in again."
        );
        assert!(!LoginError::Failed.message().contains("provider"));
    }
}
