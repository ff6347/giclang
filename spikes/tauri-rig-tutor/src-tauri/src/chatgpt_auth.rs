//! Narrow, app-owned ChatGPT device authorization port.
//!
//! Rig 0.42 exposes device OAuth only while beginning a completion.  This port
//! implements the inspectable Codex device protocol without ever importing a
//! completion client; Rig receives its resulting access context only on Send.

use base64::{Engine, prelude::BASE64_URL_SAFE_NO_PAD};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::PathBuf,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tokio_util::sync::CancellationToken;

const CLIENT_ID: &str = "app_EMoamEEZ73f0CkXaXp7hrann";
const AUTH_BASE: &str = "https://auth.openai.com";
const VERIFY_URL: &str = "https://auth.openai.com/codex/device";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Clone)]
pub struct ChatGptAuth {
    file: PathBuf,
    endpoints: Endpoints,
    client: reqwest::Client,
}

#[derive(Clone)]
struct Endpoints {
    device_code: String,
    device_token: String,
    oauth_token: String,
}
impl Endpoints {
    fn production() -> Self {
        Self {
            device_code: format!("{AUTH_BASE}/api/accounts/deviceauth/usercode"),
            device_token: format!("{AUTH_BASE}/api/accounts/deviceauth/token"),
            oauth_token: format!("{AUTH_BASE}/oauth/token"),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DeviceAuthorization {
    pub verification_url: String,
    pub user_code: String,
}
#[derive(Clone)]
pub struct AuthContext {
    pub access_token: String,
    pub account_id: Option<String>,
}

#[derive(Debug)]
pub enum AuthError {
    Cancelled,
    Failed,
}
impl AuthError {
    pub fn message(&self) -> &'static str {
        match self {
            Self::Cancelled => "ChatGPT sign-in was cancelled.",
            Self::Failed => "ChatGPT sign-in failed. Check your connection and try again.",
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
    #[serde(default, deserialize_with = "deserialize_optional_u64")]
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
    refresh_token: Option<String>,
    id_token: Option<String>,
}
#[derive(Clone, Serialize, Deserialize, Default)]
struct TokenRecord {
    access_token: Option<String>,
    refresh_token: Option<String>,
    expires_at: Option<i64>,
    account_id: Option<String>,
}

impl ChatGptAuth {
    pub fn new(file: PathBuf) -> Self {
        Self {
            file,
            endpoints: Endpoints::production(),
            client: reqwest::Client::builder()
                .connect_timeout(REQUEST_TIMEOUT)
                .timeout(REQUEST_TIMEOUT)
                .build()
                .expect("static HTTP client configuration must be valid"),
        }
    }

    pub async fn sign_in(
        &self,
        cancel: CancellationToken,
        present: impl FnOnce(DeviceAuthorization),
    ) -> Result<(), AuthError> {
        let device: DeviceCode = self
            .client
            .post(&self.endpoints.device_code)
            .json(&serde_json::json!({"client_id": CLIENT_ID}))
            .send()
            .await
            .map_err(|_| AuthError::Failed)?
            .error_for_status()
            .map_err(|_| AuthError::Failed)?
            .json()
            .await
            .map_err(|_| AuthError::Failed)?;
        let verification_url = device.verification_uri.unwrap_or_else(|| VERIFY_URL.into());
        present(DeviceAuthorization {
            verification_url,
            user_code: device.user_code.clone(),
        });
        let interval = Duration::from_secs(device.interval.unwrap_or(5));
        let device_token = loop {
            if cancel.is_cancelled() {
                return Err(AuthError::Cancelled);
            }
            let response = self.client.post(&self.endpoints.device_token).json(&serde_json::json!({"device_auth_id": device.device_auth_id, "user_code": device.user_code})).send().await.map_err(|_| AuthError::Failed)?;
            if response.status().is_success() {
                break response
                    .json::<DeviceToken>()
                    .await
                    .map_err(|_| AuthError::Failed)?;
            }
            if response.status().as_u16() != 403 && response.status().as_u16() != 404 {
                return Err(AuthError::Failed);
            }
            tokio::select! { _ = cancel.cancelled() => return Err(AuthError::Cancelled), _ = tokio::time::sleep(interval) => {} }
        };
        let tokens = self.exchange_code(&device_token).await?;
        self.store(build_record(tokens, None))
            .map_err(|_| AuthError::Failed)
    }

    pub async fn context(&self) -> Result<AuthContext, AuthError> {
        let mut record = self.load().map_err(|_| AuthError::Failed)?;
        if record.access_token.is_none() {
            return Err(AuthError::Failed);
        }
        if expired(record.expires_at) {
            let refresh = record.refresh_token.clone().ok_or(AuthError::Failed)?;
            let tokens = self.refresh(&refresh).await?;
            record = build_record(tokens, Some(refresh));
            self.store(record.clone()).map_err(|_| AuthError::Failed)?;
        }
        Ok(AuthContext {
            access_token: record.access_token.ok_or(AuthError::Failed)?,
            account_id: record.account_id,
        })
    }

    async fn exchange_code(&self, code: &DeviceToken) -> Result<TokenResponse, AuthError> {
        self.client
            .post(&self.endpoints.oauth_token)
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
            .map_err(|_| AuthError::Failed)?
            .error_for_status()
            .map_err(|_| AuthError::Failed)?
            .json()
            .await
            .map_err(|_| AuthError::Failed)
    }
    async fn refresh(&self, refresh: &str) -> Result<TokenResponse, AuthError> {
        self.client
            .post(&self.endpoints.oauth_token)
            .form(&[
                ("client_id", CLIENT_ID),
                ("grant_type", "refresh_token"),
                ("refresh_token", refresh),
                ("scope", "openid profile email"),
            ])
            .send()
            .await
            .map_err(|_| AuthError::Failed)?
            .error_for_status()
            .map_err(|_| AuthError::Failed)?
            .json()
            .await
            .map_err(|_| AuthError::Failed)
    }
    fn load(&self) -> std::io::Result<TokenRecord> {
        serde_json::from_slice(&fs::read(&self.file)?).map_err(std::io::Error::other)
    }
    fn store(&self, record: TokenRecord) -> std::io::Result<()> {
        fs::write(
            &self.file,
            serde_json::to_vec(&record).map_err(std::io::Error::other)?,
        )
    }
    pub fn sign_out(&self) -> std::io::Result<()> {
        if self.file.exists() {
            fs::remove_file(&self.file)
        } else {
            Ok(())
        }
    }

    #[cfg(test)]
    fn test_port(file: PathBuf, base: &str) -> Self {
        Self {
            file,
            endpoints: Endpoints {
                device_code: format!("{base}/device"),
                device_token: format!("{base}/poll"),
                oauth_token: format!("{base}/token"),
            },
            client: reqwest::Client::builder()
                .connect_timeout(REQUEST_TIMEOUT)
                .timeout(REQUEST_TIMEOUT)
                .build()
                .unwrap(),
        }
    }
}

fn deserialize_optional_u64<'de, D>(deserializer: D) -> Result<Option<u64>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Number {
        Integer(u64),
        String(String),
    }

    Option::<Number>::deserialize(deserializer)?
        .map(|number| match number {
            Number::Integer(value) => Ok(value),
            Number::String(value) => value.parse().map_err(serde::de::Error::custom),
        })
        .transpose()
}

fn build_record(tokens: TokenResponse, old_refresh: Option<String>) -> TokenRecord {
    let account_id = tokens
        .id_token
        .as_deref()
        .and_then(account_id)
        .or_else(|| account_id(&tokens.access_token));
    TokenRecord {
        expires_at: expiry(&tokens.access_token),
        access_token: Some(tokens.access_token),
        refresh_token: tokens.refresh_token.or(old_refresh),
        account_id,
    }
}
fn claims(token: &str) -> serde_json::Value {
    token
        .split('.')
        .nth(1)
        .and_then(|payload| BASE64_URL_SAFE_NO_PAD.decode(payload).ok())
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .unwrap_or_default()
}
fn expiry(token: &str) -> Option<i64> {
    claims(token).get("exp")?.as_i64()
}
fn account_id(token: &str) -> Option<String> {
    claims(token)
        .get("https://api.openai.com/auth")?
        .get("chatgpt_account_id")?
        .as_str()
        .map(str::to_owned)
}
fn expired(expiry: Option<i64>) -> bool {
    expiry.unwrap_or(0)
        <= SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64
            + 60
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::{
        io::{AsyncReadExt, AsyncWriteExt},
        net::TcpListener,
    };
    async fn server(
        responses: Vec<&'static str>,
    ) -> (String, tokio::task::JoinHandle<Vec<String>>) {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}", listener.local_addr().unwrap());
        let handle = tokio::spawn(async move {
            let mut paths = vec![];
            for reply in responses {
                let (mut socket, _) = listener.accept().await.unwrap();
                let mut buf = [0; 4096];
                let n = socket.read(&mut buf).await.unwrap();
                paths.push(
                    String::from_utf8_lossy(&buf[..n])
                        .lines()
                        .next()
                        .unwrap()
                        .to_owned(),
                );
                let (status, body) = if let Some(body) = reply.strip_prefix("403 ") {
                    ("403 Forbidden", body)
                } else if let Some(body) = reply.strip_prefix("500 ") {
                    ("500 Internal Server Error", body)
                } else {
                    ("200 OK", reply)
                };
                socket
                    .write_all(
                        format!(
                            "HTTP/1.1 {status}\r\ncontent-type: application/json\r\ncontent-length: {}\r\n\r\n{body}",
                            body.len(),
                        )
                        .as_bytes(),
                    )
                    .await
                    .unwrap();
            }
            paths
        });
        (url, handle)
    }
    fn file(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!("gic-auth-{name}-{}", uuid::Uuid::new_v4()))
    }
    #[tokio::test]
    async fn device_flow_polls_exchanges_and_never_calls_completion() {
        let (base,handle)=server(vec![r#"{"device_auth_id":"id","user_code":"ABCD","verification_uri":"https://auth.example/verify","interval":"0"}"#,r#"{"authorization_code":"code","code_verifier":"verifier"}"#,r#"{"access_token":"a","refresh_token":"r"}"#]).await;
        let auth = ChatGptAuth::test_port(file("flow"), &base);
        let mut shown = None;
        auth.sign_in(CancellationToken::new(), |p| shown = Some(p))
            .await
            .unwrap();
        assert_eq!(
            shown.unwrap().verification_url,
            "https://auth.example/verify"
        );
        let paths = handle.await.unwrap();
        assert_eq!(
            paths,
            vec![
                "POST /device HTTP/1.1",
                "POST /poll HTTP/1.1",
                "POST /token HTTP/1.1"
            ]
        );
        assert!(paths.iter().all(|p| !p.contains("completion")));
    }
    #[tokio::test]
    async fn pending_poll_then_token_exchange() {
        let (base, handle) = server(vec![
            r#"{"device_auth_id":"id","user_code":"ABCD","interval":0}"#,
            r#"403 {}"#,
            r#"{"authorization_code":"code","code_verifier":"verifier"}"#,
            r#"{"access_token":"a","refresh_token":"r"}"#,
        ])
        .await;
        let auth = ChatGptAuth::test_port(file("pending"), &base);
        auth.sign_in(CancellationToken::new(), |_| {})
            .await
            .unwrap();
        let paths = handle.await.unwrap();
        assert_eq!(paths.iter().filter(|p| p.contains("/poll")).count(), 2);
    }
    #[tokio::test]
    async fn expired_record_refreshes_without_exposing_tokens() {
        let (base, handle) =
            server(vec![r#"{"access_token":"fresh","refresh_token":"next"}"#]).await;
        let path = file("refresh");
        fs::write(
            &path,
            r#"{"access_token":"old","refresh_token":"refresh","expires_at":0}"#,
        )
        .unwrap();
        let auth = ChatGptAuth::test_port(path.clone(), &base);
        assert_eq!(auth.context().await.unwrap().access_token, "fresh");
        assert_eq!(handle.await.unwrap(), vec!["POST /token HTTP/1.1"]);
        assert!(!format!("{:?}", AuthError::Failed).contains("fresh"));
        fs::remove_file(path).unwrap();
    }
    #[tokio::test]
    async fn failed_auth_response_is_redacted() {
        let (base, handle) = server(vec![r#"500 raw-token-and-provider-body"#]).await;
        let error = ChatGptAuth::test_port(file("redact"), &base)
            .sign_in(CancellationToken::new(), |_| {})
            .await
            .unwrap_err();
        assert_eq!(
            error.message(),
            "ChatGPT sign-in failed. Check your connection and try again."
        );
        assert!(!error.message().contains("raw-token"));
        handle.await.unwrap();
    }

    #[test]
    fn sign_out_deletes_minimal_private_record() {
        let path = file("out");
        fs::write(&path, "{}").unwrap();
        let auth = ChatGptAuth::new(path.clone());
        auth.sign_out().unwrap();
        assert!(!path.exists());
    }
}
