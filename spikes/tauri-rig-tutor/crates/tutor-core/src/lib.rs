//! Provider-neutral protocol shared by the privileged host and the webview.

use async_trait::async_trait;
use serde::Serialize;
use tokio_util::sync::CancellationToken;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum TutorEvent {
    Status { message: String },
    Text { text: String },
    Complete,
    Cancelled,
    Error { message: String },
    DeviceAuthorization { url: String, user_code: String },
    SignedIn,
    SignedOut,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TutorQuestion(pub String);

/// A provider is never exposed to the renderer.
#[async_trait]
pub trait TutorProvider: Send + Sync {
    async fn stream(
        &self,
        question: TutorQuestion,
        cancel: CancellationToken,
        emit: &mut (dyn FnMut(TutorEvent) + Send),
    );
}

pub async fn submit(
    provider: &dyn TutorProvider,
    question: String,
    cancel: CancellationToken,
    emit: &mut (dyn FnMut(TutorEvent) + Send),
) {
    if question.trim().is_empty() {
        emit(TutorEvent::Error {
            message: "Enter a tutor prompt before sending.".into(),
        });
        return;
    }
    provider.stream(TutorQuestion(question), cancel, emit).await;
}

/// Safe user-facing errors must never include a provider response or secret.
pub fn safe_error(context: &str) -> TutorEvent {
    TutorEvent::Error {
        message: format!("{context}. Check your connection or sign in again."),
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
impl TutorProvider for DeterministicProvider {
    async fn stream(
        &self,
        _question: TutorQuestion,
        cancel: CancellationToken,
        emit: &mut (dyn FnMut(TutorEvent) + Send),
    ) {
        for text in ["What ", "have ", "you ", "tried?"] {
            if cancel.is_cancelled() {
                emit(TutorEvent::Cancelled);
                return;
            }
            emit(TutorEvent::Text { text: text.into() });
        }
        emit(TutorEvent::Complete);
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
        assert!(matches!(events.last(), Some(TutorEvent::Complete)));
        assert_eq!(
            events
                .iter()
                .filter(|e| matches!(e, TutorEvent::Text { .. }))
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
        assert_eq!(events, vec![TutorEvent::Cancelled]);
    }

    struct CountingProvider(AtomicUsize);
    #[async_trait]
    impl TutorProvider for CountingProvider {
        async fn stream(
            &self,
            _: TutorQuestion,
            _: CancellationToken,
            _: &mut (dyn FnMut(TutorEvent) + Send),
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
            TutorEvent::Error {
                message: "OpenCode request failed. Check your connection or sign in again.".into()
            }
        );
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
