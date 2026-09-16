use gic_tutor_spike_core::{DeterministicProvider, TutorEvent, submit};
use tauri::{AppHandle, Emitter};
use tokio_util::sync::CancellationToken;

#[derive(Default)]
struct ActiveRequest(std::sync::Mutex<Option<CancellationToken>>);

#[tauri::command]
async fn submit_question(
    app: AppHandle,
    state: tauri::State<'_, ActiveRequest>,
    question: String,
) -> Result<(), String> {
    let cancel = CancellationToken::new();
    *state.0.lock().map_err(|_| "request state unavailable")? = Some(cancel.clone());
    let mut emit = |event: TutorEvent| {
        app.emit("gic:tutor-event", event)
            .map_err(|error| error.to_string())
            .expect("event delivery to the local webview");
    };
    submit(&DeterministicProvider, question, cancel, &mut emit).await;
    Ok(())
}

#[tauri::command]
fn cancel_question(state: tauri::State<'_, ActiveRequest>) {
    if let Ok(mut request) = state.0.lock() {
        if let Some(cancel) = request.take() {
            cancel.cancel();
        }
    }
}

fn main() {
    tauri::Builder::default()
        .manage(ActiveRequest::default())
        .invoke_handler(tauri::generate_handler![submit_question, cancel_question])
        .run(tauri::generate_context!())
        .expect("Tauri application failed");
}
