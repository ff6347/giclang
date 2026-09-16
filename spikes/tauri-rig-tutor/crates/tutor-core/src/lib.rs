//! Provider-neutral tutor protocol. Rig stays behind this boundary.

use async_trait::async_trait;
use serde::Serialize;
use tokio_util::sync::CancellationToken;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum TutorEvent {
    Text { text: String },
    Complete,
    Cancelled,
    Error { message: String },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TutorQuestion(pub String);

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
            message: "Ask a tutor question before submitting.".into(),
        });
        return;
    }
    provider.stream(TutorQuestion(question), cancel, emit).await;
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
        assert_eq!(
            events,
            vec![
                TutorEvent::Text {
                    text: "What ".into()
                },
                TutorEvent::Text {
                    text: "have ".into()
                },
                TutorEvent::Text {
                    text: "you ".into()
                },
                TutorEvent::Text {
                    text: "tried?".into()
                },
                TutorEvent::Complete
            ]
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
    async fn no_provider_call_occurs_before_explicit_nonempty_submission() {
        let provider = CountingProvider(AtomicUsize::new(0));
        let mut events = Vec::new();
        submit(
            &provider,
            "   ".into(),
            CancellationToken::new(),
            &mut |e| events.push(e),
        )
        .await;
        assert_eq!(provider.0.load(Ordering::SeqCst), 0);
        assert!(matches!(events.as_slice(), [TutorEvent::Error { .. }]));
    }
}
