// ABOUTME: Streams constrained Socratic requests through the OpenCode Zen API.
// ABOUTME: Keeps provider credentials and cancellation state inside the native desktop boundary.

use crate::credentials::CredentialStore;
use futures_util::StreamExt;
use rig_core::{
    client::CompletionClient,
    completion::{CompletionError, CompletionModel, Message},
    providers::openai,
    streaming::StreamedAssistantContent,
};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};
use tokio_util::sync::CancellationToken;

const EVENT_NAME: &str = "opencode-agent-event";
const ZEN_URL: &str = "https://opencode.ai/zen/v1/chat/completions";
const ZEN_MODELS_URL: &str = "https://opencode.ai/zen/v1/models";
const TUTOR_POLICY: &str = include_str!("../workspace/gic-tutor/SKILL.md");

#[derive(Clone, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub(crate) enum AgentEvent {
    Text { request_id: String, text: String },
    Complete { request_id: String },
    Cancelled { request_id: String },
    Error { request_id: String, message: String },
}

#[derive(Serialize)]
pub(crate) struct TutorModel {
    pub id: String,
    pub name: String,
}

pub(crate) struct TutorState {
    request: Mutex<Option<ActiveRequest>>,
}

struct ActiveRequest {
    request_id: String,
    cancellation: CancellationToken,
}

impl Default for TutorState {
    fn default() -> Self {
        Self {
            request: Mutex::new(None),
        }
    }
}

impl TutorState {
    fn activate(&self, request_id: String, cancellation: CancellationToken) -> Result<(), String> {
        let mut request = self
            .request
            .lock()
            .map_err(|_| "Tutor request is unavailable.".to_owned())?;
        if let Some(active) = request.as_ref() {
            active.cancellation.cancel();
        }
        *request = Some(ActiveRequest {
            request_id,
            cancellation,
        });
        Ok(())
    }

    fn finish(&self, request_id: &str) {
        if let Ok(mut request) = self.request.lock() {
            if request
                .as_ref()
                .is_some_and(|active| active.request_id == request_id)
            {
                *request = None;
            }
        }
    }

    fn cancel(&self, request_id: &str) -> Result<(), String> {
        let request = self
            .request
            .lock()
            .map_err(|_| "Tutor request is unavailable.".to_owned())?;
        if let Some(active) = request
            .as_ref()
            .filter(|active| active.request_id == request_id)
        {
            active.cancellation.cancel();
        }
        Ok(())
    }
}

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

#[derive(Deserialize)]
struct SerializedContext {
    sketch: serde_json::Value,
    #[serde(default)]
    turns: Vec<SerializedTurn>,
}

#[derive(Deserialize)]
struct SerializedTurn {
    role: String,
    text: String,
}

fn parse_context(context: &str) -> (String, Vec<Message>) {
    let Ok(context) = serde_json::from_str::<SerializedContext>(context) else {
        return (context.to_owned(), Vec::new());
    };
    let history = context
        .turns
        .into_iter()
        .filter_map(|turn| match turn.role.as_str() {
            "student" => Some(Message::user(turn.text)),
            "agent" => Some(Message::assistant(turn.text)),
            _ => None,
        })
        .collect();
    (context.sketch.to_string(), history)
}

enum ProviderEvent {
    Text(String),
    Complete,
    Cancelled,
}

struct TutorRequest {
    api_key: String,
    model: String,
    prompt: String,
    history: Vec<Message>,
    cancellation: CancellationToken,
}

trait TutorProvider {
    async fn stream(
        &self,
        request: TutorRequest,
        emit: &mut (dyn FnMut(ProviderEvent) + Send),
    ) -> Result<(), String>;
}

struct RigOpenCodeProvider {
    base_url: String,
}

impl TutorProvider for RigOpenCodeProvider {
    async fn stream(
        &self,
        request: TutorRequest,
        emit: &mut (dyn FnMut(ProviderEvent) + Send),
    ) -> Result<(), String> {
        let mut headers = http::HeaderMap::new();
        headers.insert(
            "x-opencode-session",
            http::HeaderValue::from_static("gic-tutor"),
        );
        let client = openai::Client::builder()
            .api_key(request.api_key)
            .base_url(&self.base_url)
            .http_headers(headers)
            .build()
            .map_err(|_| "OpenCode client could not start.".to_owned())?;
        let model = client.completions_api().completion_model(request.model);
        let pending = model.stream(
            model
                .completion_request(request.prompt)
                .preamble(TUTOR_POLICY.to_owned())
                .messages(request.history)
                .build(),
        );
        let mut response = tokio::select! {
            _ = request.cancellation.cancelled() => {
                emit(ProviderEvent::Cancelled);
                return Ok(());
            }
            result = pending => result.map_err(|error| {
                provider_error(error, "OpenCode request failed. Check your connection or sign in again.")
            })?,
        };
        let mut completed = false;
        loop {
            let next = tokio::select! {
                _ = request.cancellation.cancelled() => {
                    emit(ProviderEvent::Cancelled);
                    return Ok(());
                }
                chunk = response.next() => chunk,
            };
            let Some(chunk) = next else {
                break;
            };
            match chunk {
                Ok(StreamedAssistantContent::Text(text)) => {
                    emit(ProviderEvent::Text(text.text));
                }
                Ok(StreamedAssistantContent::Final(_)) => completed = true,
                Ok(_) => {}
                Err(error) => {
                    return Err(provider_error(
                        error,
                        "OpenCode response stream failed. Check your connection or sign in again.",
                    ));
                }
            }
        }
        if !completed {
            return Err("OpenCode response ended before completion.".to_owned());
        }
        emit(ProviderEvent::Complete);
        Ok(())
    }
}

fn validate_model(model: &str) -> Result<&str, String> {
    let Some(model_id) = model.strip_prefix("opencode-zen/") else {
        return Err("Choose an OpenCode Zen model.".to_owned());
    };
    if model_id.trim().is_empty() {
        return Err("Choose an OpenCode model.".to_owned());
    }
    if !matches!(model_id, "big-pickle" | "space-bunny-free") {
        return Err(
            "This OpenCode model's streaming protocol has not been verified yet. Choose a supported model."
                .to_owned(),
        );
    }
    Ok(model_id)
}

fn safe_error(status: reqwest::StatusCode) -> String {
    match status {
        reqwest::StatusCode::UNAUTHORIZED => {
            "OpenCode request failed (HTTP 401): the API key was rejected. Reconnect OpenCode with a valid key.".to_owned()
        }
        reqwest::StatusCode::FORBIDDEN => {
            "OpenCode denied the request (HTTP 403). Check this API key's access to the selected model in your OpenCode Zen account.".to_owned()
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

fn provider_error(error: CompletionError, fallback: &str) -> String {
    error
        .provider_response_status()
        .map(safe_error)
        .unwrap_or_else(|| fallback.to_owned())
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
    fetch_models(&client, ZEN_MODELS_URL, &api_key).await
}

async fn fetch_models(
    client: &reqwest::Client,
    url: &str,
    api_key: &str,
) -> Result<Vec<TutorModel>, String> {
    let response = client
        .get(url)
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
            id: format!("opencode-zen/{}", model.id),
        })
        .filter(|model| validate_model(&model.id).is_ok())
        .collect())
}

#[tauri::command]
pub(crate) fn cancel_opencode_request(
    state: State<'_, TutorState>,
    request_id: String,
) -> Result<(), String> {
    state.cancel(&request_id)
}

#[tauri::command]
pub(crate) async fn send_opencode_request(
    app: AppHandle,
    credentials: State<'_, CredentialStore>,
    state: State<'_, TutorState>,
    question: String,
    context: String,
    model: String,
    request_id: String,
) -> Result<(), String> {
    let model_id = validate_model(&model)?.to_owned();
    let cancellation = CancellationToken::new();
    state.activate(request_id.clone(), cancellation.clone())?;
    let result = stream_request(
        &app,
        &credentials,
        cancellation.clone(),
        question,
        context,
        model_id,
        request_id.clone(),
    )
    .await;
    state.finish(&request_id);
    result
}

#[cfg(test)]
#[allow(clippy::items_after_test_module)]
mod tests {
    use super::*;
    use tokio::{
        io::{AsyncReadExt, AsyncWriteExt},
        net::TcpListener,
        task::JoinHandle,
    };

    #[test]
    fn native_events_use_the_browser_request_id_field() {
        let event = AgentEvent::Text {
            request_id: "request-1".to_owned(),
            text: "hello".to_owned(),
        };
        assert_eq!(
            serde_json::to_value(event).unwrap(),
            serde_json::json!({"kind":"text","requestId":"request-1","text":"hello"})
        );
    }

    #[test]
    fn cancellation_only_targets_the_matching_request() {
        let state = TutorState::default();
        let cancellation = CancellationToken::new();
        *state.request.lock().unwrap() = Some(ActiveRequest {
            request_id: "current".to_owned(),
            cancellation: cancellation.clone(),
        });

        state.cancel("previous").unwrap();
        assert!(!cancellation.is_cancelled());
        state.cancel("current").unwrap();
        assert!(cancellation.is_cancelled());
    }

    #[test]
    fn replacement_cancels_the_previous_request_and_keeps_the_new_request_active() {
        let state = TutorState::default();
        let previous = CancellationToken::new();
        let current = CancellationToken::new();
        state
            .activate("previous".to_owned(), previous.clone())
            .unwrap();
        state
            .activate("current".to_owned(), current.clone())
            .unwrap();

        assert!(previous.is_cancelled());
        assert!(!current.is_cancelled());
        state.finish("previous");
        assert_eq!(
            state.request.lock().unwrap().as_ref().unwrap().request_id,
            "current"
        );
    }

    #[test]
    fn forbidden_request_reports_access_without_suggesting_another_model() {
        let message = safe_error(reqwest::StatusCode::FORBIDDEN);
        assert!(message.contains("HTTP 403"));
        assert!(message.contains("access"));
        assert!(!message.contains("Choose another model"));
        assert!(!message.contains("Big Pickle"));
    }

    async fn provider_for(
        status: u16,
        body: &'static [u8],
    ) -> (RigOpenCodeProvider, JoinHandle<serde_json::Value>) {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let server = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut request = Vec::new();
            let mut incoming = [0; 4096];
            loop {
                let count = socket.read(&mut incoming).await.unwrap();
                request.extend_from_slice(&incoming[..count]);
                if let Some(headers_end) =
                    request.windows(4).position(|window| window == b"\r\n\r\n")
                {
                    let headers = String::from_utf8_lossy(&request[..headers_end]);
                    let body_length = headers
                        .lines()
                        .find_map(|line| {
                            let (name, value) = line.split_once(':')?;
                            name.eq_ignore_ascii_case("content-length")
                                .then(|| value.trim().parse::<usize>().ok())
                                .flatten()
                        })
                        .unwrap_or_default();
                    if request.len() >= headers_end + 4 + body_length {
                        break;
                    }
                }
            }
            let headers_end = request
                .windows(4)
                .position(|window| window == b"\r\n\r\n")
                .unwrap()
                + 4;
            let sent: serde_json::Value = serde_json::from_slice(&request[headers_end..]).unwrap();
            socket
                .write_all(
                    format!(
                        "HTTP/1.1 {status} OK\r\nContent-Type: text/event-stream\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n"
                    )
                    .as_bytes(),
                )
                .await
                .unwrap();
            for byte in body {
                socket.write_all(b"1\r\n").await.unwrap();
                socket.write_all(&[*byte]).await.unwrap();
                socket.write_all(b"\r\n").await.unwrap();
            }
            socket.write_all(b"0\r\n\r\n").await.unwrap();
            sent
        });
        (
            RigOpenCodeProvider {
                base_url: format!("http://{address}/v1"),
            },
            server,
        )
    }

    #[tokio::test]
    async fn rig_streams_chat_completions_from_a_local_server() {
        let body = "data: {\"id\":\"chatcmpl-1\",\"object\":\"chat.completion.chunk\",\"created\":1,\"model\":\"big-pickle\",\"choices\":[{\"index\":0,\"delta\":{\"content\":\"héllo\"},\"finish_reason\":null}]}\n\ndata: {\"id\":\"chatcmpl-1\",\"object\":\"chat.completion.chunk\",\"created\":1,\"model\":\"big-pickle\",\"choices\":[{\"delta\":{},\"finish_reason\":\"stop\"}],\"usage\":null}\n\ndata: [DONE]\n\n"
            .as_bytes();
        let (provider, server) = provider_for(200, body).await;
        let cancellation = CancellationToken::new();
        let mut events = Vec::new();
        provider
            .stream(
                TutorRequest {
                    api_key: "test-key".to_owned(),
                    model: "big-pickle".to_owned(),
                    prompt: "question".to_owned(),
                    history: Vec::new(),
                    cancellation,
                },
                &mut |event| events.push(event),
            )
            .await
            .unwrap();
        let sent = server.await.unwrap();
        assert_eq!(sent["model"], "big-pickle");
        assert_eq!(sent["stream"], true);
        assert_eq!(sent["messages"][0]["role"], "system");
        assert!(matches!(events.first(), Some(ProviderEvent::Text(text)) if text == "héllo"));
        assert!(matches!(events.last(), Some(ProviderEvent::Complete)));
    }

    #[tokio::test]
    async fn early_eof_is_not_reported_as_completion() {
        let body = b"data: {\"id\":\"chatcmpl-1\",\"object\":\"chat.completion.chunk\",\"created\":1,\"model\":\"big-pickle\",\"choices\":[{\"index\":0,\"delta\":{\"content\":\"partial\"},\"finish_reason\":null}]}\n\n";
        let (provider, server) = provider_for(200, body).await;
        let result = provider
            .stream(
                TutorRequest {
                    api_key: "test-key".to_owned(),
                    model: "big-pickle".to_owned(),
                    prompt: "question".to_owned(),
                    history: Vec::new(),
                    cancellation: CancellationToken::new(),
                },
                &mut |_| {},
            )
            .await;
        server.await.unwrap();
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn provider_http_error_does_not_expose_response_body() {
        let (provider, server) = provider_for(401, b"{\"error\":\"sensitive detail\"}").await;
        let result = provider
            .stream(
                TutorRequest {
                    api_key: "test-key".to_owned(),
                    model: "big-pickle".to_owned(),
                    prompt: "question".to_owned(),
                    history: Vec::new(),
                    cancellation: CancellationToken::new(),
                },
                &mut |_| {},
            )
            .await;
        server.await.unwrap();
        assert!(result.is_err());
        assert!(!result.unwrap_err().contains("sensitive detail"));
    }

    #[tokio::test]
    async fn provider_http_failures_are_actionable_without_exposing_the_body() {
        for status in [401, 429, 404] {
            let (provider, server) =
                provider_for(status, b"{\"error\":\"sensitive detail\"}").await;
            let result = provider
                .stream(
                    TutorRequest {
                        api_key: "test-key".to_owned(),
                        model: "big-pickle".to_owned(),
                        prompt: "question".to_owned(),
                        history: Vec::new(),
                        cancellation: CancellationToken::new(),
                    },
                    &mut |_| {},
                )
                .await;
            server.await.unwrap();
            assert_eq!(
                result.unwrap_err(),
                safe_error(reqwest::StatusCode::from_u16(status).unwrap())
            );
        }
    }

    #[tokio::test]
    async fn cancellation_interrupts_a_stalled_local_response() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let server = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            socket
                .write_all(
                    b"HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nTransfer-Encoding: chunked\r\n\r\n",
                )
                .await
                .unwrap();
            std::future::pending::<()>().await;
        });
        let provider = RigOpenCodeProvider {
            base_url: format!("http://{address}/v1"),
        };
        let cancellation = CancellationToken::new();
        let cancel = cancellation.clone();
        let request = tokio::spawn(async move {
            provider
                .stream(
                    TutorRequest {
                        api_key: "test-key".to_owned(),
                        model: "big-pickle".to_owned(),
                        prompt: "question".to_owned(),
                        history: Vec::new(),
                        cancellation,
                    },
                    &mut |_| {},
                )
                .await
        });
        tokio::time::sleep(std::time::Duration::from_millis(20)).await;
        cancel.cancel();
        assert!(request.await.unwrap().is_ok());
        server.abort();
    }

    #[tokio::test]
    async fn rig_http_statuses_produce_distinct_safe_diagnostics() {
        for (status, expected) in [(401, "HTTP 401"), (429, "HTTP 429"), (404, "HTTP 404")] {
            let (provider, server) = provider_for(status, b"{\"error\":\"secret\"}").await;
            let error = provider
                .stream(
                    TutorRequest {
                        api_key: "test-key".to_owned(),
                        model: "big-pickle".to_owned(),
                        prompt: "question".to_owned(),
                        history: Vec::new(),
                        cancellation: CancellationToken::new(),
                    },
                    &mut |_| {},
                )
                .await
                .unwrap_err();
            server.await.unwrap();
            assert!(error.contains(expected), "{error}");
            assert!(!error.contains("secret"), "{error}");
            if status == 401 {
                assert!(error.contains("Reconnect OpenCode"), "{error}");
            }
            if status == 429 {
                assert!(error.contains("Try again later"), "{error}");
            }
            if status == 404 {
                assert!(error.contains("Choose another model"), "{error}");
            }
        }
    }

    #[tokio::test]
    async fn catalog_only_offers_callable_models_with_an_unverified_key() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let server = tokio::spawn(async move {
            for _ in 0..3 {
                let (mut socket, _) = listener.accept().await.unwrap();
                let mut request = [0; 1024];
                let _ = socket.read(&mut request).await.unwrap();
                let body = r#"{"data":[{"id":"gpt-6-luna","name":"GPT 6 Luna"},{"id":"big-pickle","name":"Big Pickle"},{"id":"space-bunny-free","name":"Space Bunny Free"}]}"#;
                socket
                    .write_all(
                        format!(
                            "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                            body.len()
                        )
                        .as_bytes(),
                    )
                    .await
                    .unwrap();
            }
        });
        let client = reqwest::Client::new();
        for authorization in [None, Some("Bearer definitely-invalid-gic-review-key")] {
            let mut request = client.get(format!("http://{address}/zen/v1/models"));
            if let Some(authorization) = authorization {
                request = request.header(reqwest::header::AUTHORIZATION, authorization);
            }
            assert_eq!(
                request.send().await.unwrap().status(),
                reqwest::StatusCode::OK
            );
        }
        let models = fetch_models(
            &client,
            &format!("http://{address}/zen/v1/models"),
            "definitely-invalid-gic-review-key",
        )
        .await
        .unwrap();
        server.await.unwrap();
        assert_eq!(models.len(), 2);
        assert_eq!(models[0].id, "opencode-zen/big-pickle");
        assert_eq!(models[1].id, "opencode-zen/space-bunny-free");
    }

    #[test]
    fn only_the_supported_chat_completion_models_are_enabled() {
        assert!(validate_model("opencode-zen/big-pickle").is_ok());
        assert_eq!(
            validate_model("opencode-zen/space-bunny-free").unwrap(),
            "space-bunny-free"
        );
        assert!(validate_model("openrouter/big-pickle").is_err());
        assert!(validate_model("opencode-go/big-pickle").is_err());
        assert!(validate_model("openai-codex/big-pickle").is_err());
        assert!(validate_model("big-pickle").is_err());
        assert!(validate_model("gpt-6-luna").is_err());
    }

    #[test]
    fn conversation_context_keeps_turn_roles() {
        let (sketch, history) = parse_context(
            r#"{"sketch":{"source":"rect(1);"},"turns":[{"role":"student","text":"Why?"},{"role":"agent","text":"What have you tried?"}]}"#,
        );
        assert_eq!(sketch, r#"{"source":"rect(1);"}"#);
        assert_eq!(history.len(), 2);
        assert!(matches!(history[0], Message::User { .. }));
        assert!(matches!(history[1], Message::Assistant { .. }));
    }
}

async fn stream_request(
    app: &AppHandle,
    credentials: &CredentialStore,
    cancellation: CancellationToken,
    question: String,
    context: String,
    model: String,
    request_id: String,
) -> Result<(), String> {
    let api_key = credentials.with_opencode_key(|key| key.to_owned())?;
    let (sketch, history) = parse_context(&context);
    let prompt = format!("Sketch and preview context:\n{sketch}\n\nStudent question: {question}");
    let provider = RigOpenCodeProvider {
        base_url: ZEN_URL.trim_end_matches("/chat/completions").to_owned(),
    };
    let result = provider
        .stream(
            TutorRequest {
                api_key,
                model,
                prompt,
                history,
                cancellation,
            },
            &mut |event| {
                let event = match event {
                    ProviderEvent::Text(text) => AgentEvent::Text {
                        request_id: request_id.clone(),
                        text,
                    },
                    ProviderEvent::Complete => AgentEvent::Complete {
                        request_id: request_id.clone(),
                    },
                    ProviderEvent::Cancelled => AgentEvent::Cancelled {
                        request_id: request_id.clone(),
                    },
                };
                let _ = app.emit(EVENT_NAME, event);
            },
        )
        .await;
    if let Err(message) = &result {
        let _ = app.emit(
            EVENT_NAME,
            AgentEvent::Error {
                request_id,
                message: message.clone(),
            },
        );
    }
    result
}
