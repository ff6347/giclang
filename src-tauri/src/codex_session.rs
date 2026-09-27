// ABOUTME: Resolves authenticated Codex request credentials inside the desktop host.
// ABOUTME: Refreshes expired subscriptions without letting stale responses restore sign-out.

use crate::{
    codex_auth::{account_id, token_claims, CLIENT_ID, OAUTH_TOKEN_URL},
    credentials::CredentialStore,
};
use serde::Deserialize;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::Mutex;
use tokio_util::sync::CancellationToken;

#[derive(Default)]
pub(crate) struct CodexSession {
    refresh: Mutex<()>,
}

pub(crate) struct CodexAccess {
    pub access_token: String,
    pub account_id: String,
}

#[derive(Deserialize)]
struct RefreshResponse {
    access_token: String,
    refresh_token: String,
    id_token: Option<String>,
}

fn token_expiry(token: &str) -> Option<u64> {
    token_claims(token)?.get("exp")?.as_u64()
}

impl CodexSession {
    pub(crate) async fn access(
        &self,
        credentials: &CredentialStore,
        cancellation: &CancellationToken,
    ) -> Result<CodexAccess, String> {
        let client = reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(30))
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|_| "Codex could not start. Try again.".to_owned())?;
        self.access_at(credentials, &client, OAUTH_TOKEN_URL, cancellation)
            .await
    }

    async fn access_at(
        &self,
        credentials: &CredentialStore,
        client: &reqwest::Client,
        url: &str,
        cancellation: &CancellationToken,
    ) -> Result<CodexAccess, String> {
        let _guard = tokio::select! {
            _ = cancellation.cancelled() => return Err("Codex request was cancelled.".to_owned()),
            guard = self.refresh.lock() => guard,
        };
        let (access_token, refresh_token, saved_account) =
            credentials.with_codex_credentials(|access, refresh, account| {
                (access.to_owned(), refresh.to_owned(), account.to_owned())
            })?;
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| "Codex authorization is unavailable. Sign in again.".to_owned())?
            .as_secs();
        if token_expiry(&access_token).is_some_and(|expiry| expiry > now.saturating_add(60)) {
            return Ok(CodexAccess {
                access_token,
                account_id: saved_account,
            });
        }
        let refresh = async {
            let response = client
                .post(url)
                .form(&[
                    ("grant_type", "refresh_token"),
                    ("refresh_token", refresh_token.as_str()),
                    ("client_id", CLIENT_ID),
                ])
                .send()
                .await
                .map_err(|_| "Codex refresh could not reach ChatGPT. Try again.".to_owned())?;
            if matches!(response.status().as_u16(), 400 | 401 | 403) {
                return Err("Codex authorization expired or was revoked. Sign in again.".to_owned());
            }
            if !response.status().is_success() {
                return Err("Codex refresh failed. Try again.".to_owned());
            }
            response.json::<RefreshResponse>().await.map_err(|_| {
                "Codex returned an invalid refresh response. Sign in again.".to_owned()
            })
        };
        let tokens = tokio::select! {
            _ = cancellation.cancelled() => return Err("Codex request was cancelled.".to_owned()),
            result = tokio::time::timeout(Duration::from_secs(30), refresh) => {
                result.map_err(|_| "Codex refresh timed out. Try again.".to_owned())??
            }
        };
        let refreshed_account = tokens
            .id_token
            .as_deref()
            .and_then(account_id)
            .or_else(|| account_id(&tokens.access_token));
        if refreshed_account.as_deref() != Some(saved_account.as_str())
            || token_expiry(&tokens.access_token).is_none_or(|expiry| expiry <= now)
            || tokens.refresh_token.trim().is_empty()
        {
            return Err("Codex returned an invalid account response. Sign in again.".to_owned());
        }
        if cancellation.is_cancelled() {
            return Err("Codex request was cancelled.".to_owned());
        }
        if !credentials.replace_codex_if_current(
            &refresh_token,
            &saved_account,
            &tokens.access_token,
            &tokens.refresh_token,
        )? {
            return Err("Codex account changed. Retry the request.".to_owned());
        }
        Ok(CodexAccess {
            access_token: tokens.access_token,
            account_id: saved_account,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::credentials::CredentialStore;
    use base64::{prelude::BASE64_URL_SAFE_NO_PAD, Engine};
    use std::sync::Arc;
    use tokio::{
        io::{AsyncReadExt, AsyncWriteExt},
        net::TcpListener,
        sync::oneshot,
    };
    use tokio_util::sync::CancellationToken;

    fn token(expiry: u64) -> String {
        let claims = serde_json::json!({
            "exp": expiry,
            "https://api.openai.com/auth": {"chatgpt_account_id": "account"},
        });
        format!("x.{}.x", BASE64_URL_SAFE_NO_PAD.encode(claims.to_string()))
    }

    #[tokio::test]
    async fn expired_access_refreshes_once_and_rotation_survives_restart() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("auth.json");
        let store = CredentialStore::new(path.clone());
        store
            .authenticate_codex(&token(1), "previous-refresh", "account")
            .unwrap();
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}/token", listener.local_addr().unwrap());
        let fresh = token(u64::MAX / 2);
        let response = serde_json::json!({
            "access_token": fresh,
            "refresh_token": "rotated-refresh",
        })
        .to_string();
        let server = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut bytes = Vec::new();
            let mut buffer = [0; 1024];
            loop {
                let count = socket.read(&mut buffer).await.unwrap();
                bytes.extend_from_slice(&buffer[..count]);
                let Some(body_start) = bytes.windows(4).position(|part| part == b"\r\n\r\n") else {
                    continue;
                };
                let headers = String::from_utf8_lossy(&bytes[..body_start]);
                let length = headers
                    .lines()
                    .find_map(|line| {
                        line.to_ascii_lowercase()
                            .strip_prefix("content-length:")
                            .map(str::to_owned)
                    })
                    .unwrap()
                    .trim()
                    .parse::<usize>()
                    .unwrap();
                if bytes.len() >= body_start + 4 + length {
                    break;
                }
            }
            socket
                .write_all(
                    format!(
                        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{response}",
                        response.len()
                    )
                    .as_bytes(),
                )
                .await
                .unwrap();
            String::from_utf8(bytes).unwrap()
        });
        let session = CodexSession::default();
        let client = reqwest::Client::new();
        let cancellation = CancellationToken::new();
        let (first, second) = tokio::join!(
            session.access_at(&store, &client, &url, &cancellation),
            session.access_at(&store, &client, &url, &cancellation),
        );
        let context = first.unwrap();
        assert_eq!(second.unwrap().access_token, context.access_token);
        assert_eq!(context.account_id, "account");
        assert_eq!(context.access_token, fresh);
        let request = server.await.unwrap();
        assert!(request.starts_with("POST /token HTTP/1.1"));
        assert!(request.contains("grant_type=refresh_token"));
        assert!(request.contains("refresh_token=previous-refresh"));
        assert!(!request.contains("rotated-refresh"));
        let restarted = CredentialStore::new(path);
        assert_eq!(
            session
                .access_at(
                    &restarted,
                    &reqwest::Client::new(),
                    "http://127.0.0.1:1/token",
                    &CancellationToken::new(),
                )
                .await
                .unwrap()
                .access_token,
            fresh
        );
        assert_eq!(
            restarted
                .with_codex_credentials(|_, refresh, _| refresh.to_owned())
                .unwrap(),
            "rotated-refresh"
        );
    }

    #[tokio::test]
    async fn sign_out_while_refresh_waits_cannot_restore_the_account() {
        let directory = tempfile::tempdir().unwrap();
        let store = Arc::new(CredentialStore::new(directory.path().join("auth.json")));
        store
            .authenticate_codex(&token(1), "previous-refresh", "account")
            .unwrap();
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}/token", listener.local_addr().unwrap());
        let (waiting, observed) = oneshot::channel();
        let (release, proceed) = oneshot::channel();
        let response = serde_json::json!({
            "access_token": token(u64::MAX / 2),
            "refresh_token": "rotated-refresh",
        })
        .to_string();
        let server = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            waiting.send(()).unwrap();
            proceed.await.unwrap();
            socket
                .write_all(
                    format!(
                        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{response}",
                        response.len()
                    )
                    .as_bytes(),
                )
                .await
                .unwrap();
        });
        let session = Arc::new(CodexSession::default());
        let request_store = store.clone();
        let request_session = session.clone();
        let request = tokio::spawn(async move {
            request_session
                .access_at(
                    &request_store,
                    &reqwest::Client::new(),
                    &url,
                    &CancellationToken::new(),
                )
                .await
        });
        observed.await.unwrap();
        store.sign_out_codex().unwrap();
        release.send(()).unwrap();
        assert!(request.await.unwrap().is_err());
        server.await.unwrap();
        assert!(!store.status().unwrap().codex_authenticated);
        assert!(!directory.path().join("auth.json").exists());
    }

    #[tokio::test]
    async fn rejected_refresh_is_actionable_without_exposing_the_response() {
        let directory = tempfile::tempdir().unwrap();
        let store = CredentialStore::new(directory.path().join("auth.json"));
        store
            .authenticate_codex(&token(1), "synthetic-refresh", "account")
            .unwrap();
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}/token", listener.local_addr().unwrap());
        let server = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            socket
                .write_all(b"HTTP/1.1 401 Unauthorized\r\nContent-Length: 17\r\nConnection: close\r\n\r\nsynthetic-refresh")
                .await
                .unwrap();
        });
        let error = session_error(&store, &url).await;
        assert_eq!(
            error,
            "Codex authorization expired or was revoked. Sign in again."
        );
        assert!(!error.contains("synthetic-refresh"));
        assert!(store.status().unwrap().codex_authenticated);
        server.await.unwrap();
    }

    async fn session_error(store: &CredentialStore, url: &str) -> String {
        CodexSession::default()
            .access_at(
                store,
                &reqwest::Client::new(),
                url,
                &CancellationToken::new(),
            )
            .await
            .err()
            .expect("refresh must fail")
    }
}
