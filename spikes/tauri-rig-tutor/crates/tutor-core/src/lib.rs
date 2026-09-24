//! Provider-neutral protocol shared by the privileged host and the webview.

use async_trait::async_trait;
use serde::Serialize;
use tokio_util::sync::CancellationToken;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum AgentEvent {
    Status { message: String },
    Diagnostic { message: String },
    Text { text: String },
    Complete,
    Cancelled,
    Error { message: String },
    DeviceAuthorization { url: String, user_code: String },
    SignedIn,
    SignedOut,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AgentQuestion(pub String);

/// A provider is never exposed to the renderer.
#[async_trait]
pub trait AgentProvider: Send + Sync {
    async fn stream(
        &self,
        question: AgentQuestion,
        cancel: CancellationToken,
        emit: &mut (dyn FnMut(AgentEvent) + Send),
    );
}

pub async fn submit(
    provider: &dyn AgentProvider,
    question: String,
    cancel: CancellationToken,
    emit: &mut (dyn FnMut(AgentEvent) + Send),
) {
    if question.trim().is_empty() {
        emit(AgentEvent::Error {
            message: "Enter an agent prompt before sending.".into(),
        });
        return;
    }
    provider.stream(AgentQuestion(question), cancel, emit).await;
}

/// Safe user-facing errors must never include a provider response or secret.
pub fn safe_error(context: &str) -> AgentEvent {
    AgentEvent::Error {
        message: format!("{context}. Check your connection or sign in again."),
    }
}

pub fn provider_diagnostic(
    provider: &str,
    category: &str,
    status: Option<u16>,
    response: Option<&str>,
) -> String {
    let mut parts = vec![format!("{provider}: {category}")];
    if let Some(status) = status {
        parts.push(format!("HTTP {status}"));
    }
    if let Some(response) = response.and_then(summarize_provider_response) {
        parts.push(response);
    }
    parts.join("; ")
}

fn summarize_provider_response(response: &str) -> Option<String> {
    let response = response.trim();
    if response.is_empty() {
        return None;
    }
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(response) {
        let error = value.get("error").unwrap_or(&value);
        let mut fields = Vec::new();
        for name in ["code", "type", "message", "detail"] {
            if let Some(value) = error.get(name).and_then(serde_json::Value::as_str) {
                fields.push(format!("{name}={}", truncate(value, 500)));
            }
        }
        return (!fields.is_empty()).then(|| fields.join(", "));
    }
    Some(truncate(response, 1_000))
}

fn truncate(value: &str, limit: usize) -> String {
    let mut chars = value.chars();
    let truncated: String = chars.by_ref().take(limit).collect();
    if chars.next().is_some() {
        format!("{truncated}…")
    } else {
        truncated
    }
}

/// Shared no-overlap state for every provider operation.
#[derive(Debug, Default)]
pub struct RequestGate {
    active: bool,
}

impl RequestGate {
    pub fn begin(&mut self) -> bool {
        if self.active {
            return false;
        }
        self.active = true;
        true
    }

    pub fn finish(&mut self) {
        self.active = false;
    }

    pub fn is_active(&self) -> bool {
        self.active
    }
}

#[derive(Default)]
pub struct DeterministicProvider;

#[async_trait]
impl AgentProvider for DeterministicProvider {
    async fn stream(
        &self,
        _question: AgentQuestion,
        cancel: CancellationToken,
        emit: &mut (dyn FnMut(AgentEvent) + Send),
    ) {
        for text in ["What ", "have ", "you ", "tried?"] {
            if cancel.is_cancelled() {
                emit(AgentEvent::Cancelled);
                return;
            }
            emit(AgentEvent::Text { text: text.into() });
        }
        emit(AgentEvent::Complete);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    #[tokio::test]
    async fn streams_normalized_text_then_complete() {
        let mut events = Vec::new();
        submit(
            &DeterministicProvider,
            "help".into(),
            CancellationToken::new(),
            &mut |e| events.push(e),
        )
        .await;
        assert!(matches!(events.last(), Some(AgentEvent::Complete)));
        assert_eq!(
            events
                .iter()
                .filter(|e| matches!(e, AgentEvent::Text { .. }))
                .count(),
            4
        );
    }

    #[tokio::test]
    async fn cancellation_is_a_terminal_event() {
        let cancel = CancellationToken::new();
        cancel.cancel();
        let mut events = Vec::new();
        submit(&DeterministicProvider, "help".into(), cancel, &mut |e| {
            events.push(e)
        })
        .await;
        assert_eq!(events, vec![AgentEvent::Cancelled]);
    }

    struct CountingProvider(AtomicUsize);
    #[async_trait]
    impl AgentProvider for CountingProvider {
        async fn stream(
            &self,
            _: AgentQuestion,
            _: CancellationToken,
            _: &mut (dyn FnMut(AgentEvent) + Send),
        ) {
            self.0.fetch_add(1, Ordering::SeqCst);
        }
    }

    #[tokio::test]
    async fn blank_submission_never_calls_a_provider() {
        let provider = CountingProvider(AtomicUsize::new(0));
        submit(
            &provider,
            "  ".into(),
            CancellationToken::new(),
            &mut |_| {},
        )
        .await;
        assert_eq!(provider.0.load(Ordering::SeqCst), 0);
    }

    #[test]
    fn provider_errors_are_redacted() {
        assert_eq!(
            safe_error("OpenCode request failed"),
            AgentEvent::Error {
                message: "OpenCode request failed. Check your connection or sign in again.".into()
            }
        );
    }

    #[test]
    fn provider_diagnostics_include_safe_error_fields_but_not_tokens() {
        let diagnostic = provider_diagnostic(
            "ChatGPT",
            "provider response",
            Some(400),
            Some(
                r#"{"error":{"code":"unsupported_model","message":"Use a Codex model"},"access_token":"secret"}"#,
            ),
        );
        assert_eq!(
            diagnostic,
            "ChatGPT: provider response; HTTP 400; code=unsupported_model, message=Use a Codex model"
        );
        assert!(!diagnostic.contains("secret"));
        assert!(!diagnostic.contains("access_token"));
    }

    #[test]
    fn request_gate_rejects_overlap_and_recovers_after_a_terminal_outcome() {
        let mut gate = RequestGate::default();
        assert!(gate.begin());
        assert!(gate.is_active());
        assert!(!gate.begin());
        gate.finish();
        assert!(gate.begin());
    }
}
