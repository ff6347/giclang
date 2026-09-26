// ABOUTME: Streams constrained Socratic requests through the OpenCode Zen API.
// ABOUTME: Keeps provider credentials and cancellation state inside the native desktop boundary.

use crate::credentials::CredentialStore;
use futures_util::StreamExt;
use rig_core::{
    client::CompletionClient,
    completion::{CompletionError, CompletionModel, FinishReason, Message},
    providers::{anthropic, openai},
    streaming::StreamedAssistantContent,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};
use tokio_util::sync::CancellationToken;

const EVENT_NAME: &str = "opencode-agent-event";
const ZEN_URL: &str = "https://opencode.ai/zen/v1/chat/completions";
const ZEN_MODELS_URL: &str = "https://opencode.ai/zen/v1/models";
const OPENROUTER_MODELS_URL: &str = "https://openrouter.ai/api/v1/models/user";
const OPENROUTER_KEY_URL: &str = "https://openrouter.ai/api/v1/key";
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pricing: Option<String>,
    #[serde(rename = "isFree", skip_serializing_if = "Option::is_none")]
    pub is_free: Option<bool>,
    #[serde(rename = "otherCharges", skip_serializing_if = "Option::is_none")]
    pub other_charges: Option<bool>,
    #[serde(rename = "accountLimit", skip_serializing_if = "Option::is_none")]
    pub account_limit: Option<String>,
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

#[derive(Deserialize)]
struct OpenRouterModelList {
    data: Vec<OpenRouterModel>,
}

#[derive(Deserialize)]
struct OpenRouterModel {
    id: String,
    name: String,
    #[serde(default)]
    architecture: OpenRouterArchitecture,
    #[serde(default)]
    pricing: OpenRouterPricing,
    #[serde(default)]
    expiration_date: Option<String>,
}

#[derive(Default, Deserialize)]
struct OpenRouterArchitecture {
    modality: Option<String>,
}

#[derive(Default, Deserialize)]
struct OpenRouterPricing {
    prompt: Option<String>,
    completion: Option<String>,
    #[serde(flatten)]
    other: HashMap<String, serde_json::Value>,
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
        match zen_route(&request.model) {
            Some(ZenRoute::Responses) => {
                let client = openai::Client::builder()
                    .api_key(request.api_key.clone())
                    .base_url(&self.base_url)
                    .http_headers(headers)
                    .build()
                    .map_err(|_| "OpenCode client could not start.".to_owned())?;
                stream_zen_model(
                    client.completion_model(request.model.clone()),
                    request,
                    emit,
                )
                .await
            }
            Some(ZenRoute::Messages) => {
                let client = anthropic::Client::builder()
                    .api_key(request.api_key.clone())
                    .base_url(&self.base_url)
                    .http_headers(headers)
                    .build()
                    .map_err(|_| "OpenCode client could not start.".to_owned())?;
                stream_zen_model(
                    client.completion_model(request.model.clone()),
                    request,
                    emit,
                )
                .await
            }
            Some(ZenRoute::ChatCompletions) => {
                let client = openai::Client::builder()
                    .api_key(request.api_key.clone())
                    .base_url(&self.base_url)
                    .http_headers(headers)
                    .build()
                    .map_err(|_| "OpenCode client could not start.".to_owned())?;
                stream_zen_model(
                    client
                        .completions_api()
                        .completion_model(request.model.clone()),
                    request,
                    emit,
                )
                .await
            }
            None => Err("Choose a supported OpenCode model.".to_owned()),
        }
    }
}

async fn stream_zen_model<M: CompletionModel + Clone>(
    model: M,
    request: TutorRequest,
    emit: &mut (dyn FnMut(ProviderEvent) + Send),
) -> Result<(), String> {
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
            Ok(StreamedAssistantContent::Final(final_response)) => match final_response
                .finish_reason
            {
                Some(FinishReason::Stop) => completed = true,
                Some(FinishReason::Length) => {
                    return Err(
                        "OpenCode response reached its token limit before completion.".to_owned(),
                    );
                }
                _ => return Err("OpenCode response did not complete successfully.".to_owned()),
            },
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

struct RigOpenRouterProvider {
    base_url: String,
}

impl TutorProvider for RigOpenRouterProvider {
    async fn stream(
        &self,
        request: TutorRequest,
        emit: &mut (dyn FnMut(ProviderEvent) + Send),
    ) -> Result<(), String> {
        let catalog_client = reqwest::Client::builder()
            .user_agent("gic/0.1")
            .build()
            .map_err(|_| "OpenRouter client could not start.".to_owned())?;
        let base_url = self.base_url.trim_end_matches('/');
        let key_url = format!("{base_url}/key");
        let models_url = format!("{base_url}/models/user");
        let selected_model = format!("openrouter/{}", request.model);
        let model = tokio::select! {
            _ = request.cancellation.cancelled() => {
                emit(ProviderEvent::Cancelled);
                return Ok(());
            }
            result = authorize_openrouter_model(
                &catalog_client,
                &key_url,
                &models_url,
                &request.api_key,
                &selected_model,
            ) => result?,
        };
        let client = rig_core::providers::openrouter::Client::builder()
            .api_key(request.api_key)
            .base_url(&self.base_url)
            .build()
            .map_err(|_| "OpenRouter client could not start.".to_owned())?;
        let model = client.completion_model(model);
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
                openrouter_provider_error(
                    error,
                    "OpenRouter request failed. Check your connection or account access.",
                )
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
                Ok(StreamedAssistantContent::Final(final_response)) => {
                    if matches!(
                        final_response.finish_reason,
                        Some(FinishReason::Other(reason)) if reason == "error"
                    ) {
                        return Err(
                            "OpenRouter reported a streaming error. Check account limits and model access."
                                .to_owned(),
                        );
                    }
                    completed = true;
                }
                Ok(_) => {}
                Err(error) => {
                    return Err(openrouter_provider_error(
                        error,
                        "OpenRouter response stream failed. Check account limits and model access.",
                    ));
                }
            }
        }
        if !completed {
            return Err("OpenRouter response ended before completion.".to_owned());
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
    if zen_route(model_id).is_none() {
        return Err(
            "This OpenCode model's streaming protocol has not been verified yet. Choose a supported model."
                .to_owned(),
        );
    }
    Ok(model_id)
}

#[derive(Debug, PartialEq, Eq)]
enum ZenRoute {
    ChatCompletions,
    Responses,
    Messages,
}

fn zen_route(model: &str) -> Option<ZenRoute> {
    match model {
        "big-pickle"
        | "space-bunny-free"
        | "deepseek-v4-flash"
        | "deepseek-v4-flash-vision-exp"
        | "deepseek-v4-pro"
        | "deepseek-v4.1-flash"
        | "glm-5.2"
        | "glm-5.3"
        | "glm-5.3-flash"
        | "kimi-k2.7-code"
        | "kimi-k3"
        | "ling-3.0-flash-fin-free"
        | "minimax-m2.7"
        | "minimax-m3"
        | "mimo-v2.5-free"
        | "mimo-v2.6-flash-free"
        | "nemotron-3-ultra-free"
        | "nemotron-3.5-lightning-free"
        | "qwen3.8-max" => Some(ZenRoute::ChatCompletions),
        "gpt-6-astra"
        | "gpt-6-sol"
        | "gpt-6-luna"
        | "gpt-5.6-sol"
        | "gpt-5.6-terra"
        | "gpt-5.6-luna"
        | "gpt-5.5"
        | "gpt-5.5-pro"
        | "gpt-5.4"
        | "gpt-5.4-pro"
        | "gpt-5.4-mini"
        | "gpt-5.4-nano"
        | "gpt-5.3-codex"
        | "gpt-5.3-codex-spark"
        | "gpt-5.2"
        | "gpt-5.2-codex"
        | "gpt-5.1"
        | "gpt-5.1-codex"
        | "gpt-5.1-codex-max"
        | "gpt-5.1-codex-mini"
        | "gpt-5"
        | "gpt-5-codex"
        | "gpt-5-nano"
        | "grok-4.5"
        | "grok-4.6"
        | "grok-4.7"
        | "muse-spark-1.2"
        | "muse-spark-1.3"
        | "muse-spark-1.3-contributor-free" => Some(ZenRoute::Responses),
        "claude-fable-5-1" | "claude-fable-5" | "claude-opus-5-5" | "claude-opus-5"
        | "claude-opus-4-8" | "claude-opus-4-7" | "claude-opus-4-6" | "claude-opus-4-5"
        | "claude-sonnet-5" | "claude-sonnet-4-6" | "claude-sonnet-4-5" | "claude-haiku-4-5"
        | "qwen3.6-plus" | "qwen3.8-flash" => Some(ZenRoute::Messages),
        _ => None,
    }
}

fn validate_openrouter_model(model: &str) -> Result<&str, String> {
    let Some(model_id) = model.strip_prefix("openrouter/") else {
        return Err("Choose an OpenRouter model.".to_owned());
    };
    let mut parts = model_id.split('/');
    if parts.next().is_none_or(str::is_empty)
        || parts.next().is_none_or(str::is_empty)
        || parts.next().is_some()
        || model_id
            .chars()
            .any(|character| character.is_control() || character.is_whitespace())
    {
        return Err("Choose a supported OpenRouter model.".to_owned());
    }
    Ok(model_id)
}

fn openrouter_status_error(status: reqwest::StatusCode) -> String {
    match status.as_u16() {
        401 => "OpenRouter rejected this API key (HTTP 401). Reconnect with a valid key.",
        402 => "OpenRouter requires available account credits for this request (HTTP 402). Check account credits and model pricing.",
        403 => "OpenRouter denied this request (HTTP 403). Check key permissions and model access.",
        404 => "OpenRouter could not find this model (HTTP 404). Select another available model.",
        408 => "OpenRouter timed out (HTTP 408). Retry the request.",
        429 => "OpenRouter rate-limited this request (HTTP 429). Check account limits or retry later.",
        502 => "OpenRouter is temporarily unavailable (HTTP 502). Retry later.",
        503 => "OpenRouter is temporarily unavailable (HTTP 503). Retry later.",
        _ => "OpenRouter request failed. Check account access and try again.",
    }
    .to_owned()
}

fn openrouter_provider_error(error: CompletionError, fallback: &str) -> String {
    error
        .provider_response_status()
        .map(|status| {
            openrouter_status_error(
                reqwest::StatusCode::from_u16(status.as_u16())
                    .unwrap_or(reqwest::StatusCode::INTERNAL_SERVER_ERROR),
            )
        })
        .unwrap_or_else(|| fallback.to_owned())
}

fn openrouter_model_eligible(model: &OpenRouterModel, today: chrono::NaiveDate) -> bool {
    model
        .architecture
        .modality
        .as_deref()
        .and_then(|modality| modality.split_once("->"))
        .is_some_and(|(input, output)| {
            output == "text" && input.split('+').any(|part| part == "text")
        })
        && match model.expiration_date.as_deref() {
            None => true,
            Some(date) => {
                chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d").is_ok_and(|date| date >= today)
            }
        }
        && validate_openrouter_model(&format!("openrouter/{}", model.id)).is_ok()
        && openrouter_prices(model).is_some()
}

fn openrouter_prices(model: &OpenRouterModel) -> Option<(f64, f64)> {
    let input = model.pricing.prompt.as_deref()?.parse::<f64>().ok()?;
    let output = model.pricing.completion.as_deref()?.parse::<f64>().ok()?;
    (input.is_finite() && output.is_finite() && input >= 0.0 && output >= 0.0)
        .then_some((input, output))
}

fn format_model_price(per_token: f64) -> String {
    let per_million = per_token * 1_000_000.0;
    if per_million > 0.0 && per_million < 0.01 {
        "<$0.01".to_owned()
    } else {
        format!("${per_million:.2}")
    }
}

fn has_other_charges(model: &OpenRouterModel) -> bool {
    model.pricing.other.values().any(|value| match value {
        serde_json::Value::Null => false,
        serde_json::Value::String(amount) => amount.parse::<f64>() != Ok(0.0),
        serde_json::Value::Number(amount) => amount.as_f64() != Some(0.0),
        serde_json::Value::Array(entries) => !entries.is_empty(),
        _ => true,
    })
}

fn model_is_free(model: &OpenRouterModel, (input, output): (f64, f64)) -> bool {
    input == 0.0 && output == 0.0 && !has_other_charges(model)
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

async fn authorize_openrouter_model(
    client: &reqwest::Client,
    key_url: &str,
    models_url: &str,
    api_key: &str,
    selected_model: &str,
) -> Result<String, String> {
    let selected_id = validate_openrouter_model(selected_model)?;
    let catalog = fetch_openrouter_models(client, key_url, models_url, api_key).await?;
    if catalog.iter().any(|model| model.id == selected_model) {
        Ok(selected_id.to_owned())
    } else {
        Err(
            "The selected OpenRouter model is no longer available. Refresh the model list."
                .to_owned(),
        )
    }
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
            pricing: None,
            is_free: None,
            other_charges: None,
            account_limit: None,
        })
        .filter(|model| validate_model(&model.id).is_ok())
        .collect())
}

#[tauri::command]
pub(crate) async fn openrouter_models(
    credentials: State<'_, CredentialStore>,
) -> Result<Vec<TutorModel>, String> {
    let api_key = credentials.with_openrouter_key(str::to_owned)?;
    let client = reqwest::Client::builder()
        .user_agent("gic/0.1")
        .build()
        .map_err(|_| "OpenRouter client could not start.".to_owned())?;
    fetch_openrouter_models(&client, OPENROUTER_KEY_URL, OPENROUTER_MODELS_URL, &api_key).await
}

async fn fetch_openrouter_models(
    client: &reqwest::Client,
    key_url: &str,
    models_url: &str,
    api_key: &str,
) -> Result<Vec<TutorModel>, String> {
    let account = client
        .get(key_url)
        .bearer_auth(api_key)
        .send()
        .await
        .map_err(|_| "OpenRouter account check failed. Check your connection.".to_owned())?;
    if !account.status().is_success() {
        return Err(openrouter_status_error(account.status()));
    }
    let account: serde_json::Value = account
        .json()
        .await
        .map_err(|_| "OpenRouter returned an invalid account response.".to_owned())?;
    let account_data = account
        .get("data")
        .filter(|data| data.is_object())
        .ok_or_else(|| "OpenRouter returned an invalid account response.".to_owned())?;
    let remaining = account_data.get("limit_remaining").and_then(|value| {
        value
            .as_str()
            .map(str::to_owned)
            .or_else(|| value.as_f64().map(|number| number.to_string()))
    });
    let limit = account_data.get("limit").and_then(|value| {
        value
            .as_str()
            .map(str::to_owned)
            .or_else(|| value.as_f64().map(|number| number.to_string()))
    });
    let account_limit = match (
        remaining,
        limit,
        account_data
            .get("is_free_tier")
            .and_then(serde_json::Value::as_bool),
    ) {
        (Some(remaining), Some(limit), _) => {
            Some(format!("Account remaining ${remaining} of ${limit}"))
        }
        (Some(remaining), None, _) => Some(format!("Account remaining ${remaining}")),
        (_, _, Some(true)) => Some("OpenRouter free-tier limits apply".to_owned()),
        _ => None,
    };
    let response = client
        .get(models_url)
        .bearer_auth(api_key)
        .send()
        .await
        .map_err(|_| "OpenRouter model discovery failed. Check your connection.".to_owned())?;
    if !response.status().is_success() {
        return Err(openrouter_status_error(response.status()));
    }
    let list: OpenRouterModelList = response
        .json()
        .await
        .map_err(|_| "OpenRouter returned an invalid model catalog.".to_owned())?;
    let today = chrono::Utc::now().date_naive();
    Ok(list
        .data
        .into_iter()
        .filter(|model| openrouter_model_eligible(model, today))
        .map(|model| {
            let prices = openrouter_prices(&model);
            let other_charges = has_other_charges(&model);
            let is_free = prices.map(|prices| model_is_free(&model, prices));
            let pricing = prices.map(|(input, output)| {
                format!(
                    "{}/1M input tokens, {}/1M output tokens",
                    format_model_price(input),
                    format_model_price(output)
                )
            });
            TutorModel {
                id: format!("openrouter/{}", model.id),
                name: model.name,
                pricing,
                is_free,
                other_charges: Some(other_charges),
                account_limit: account_limit.clone(),
            }
        })
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
    let model_id = if model.starts_with("openrouter/") {
        format!("openrouter/{}", validate_openrouter_model(&model)?)
    } else {
        validate_model(&model)?.to_owned()
    };
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

    #[test]
    fn openrouter_models_require_author_and_model_and_exclude_router_aliases() {
        assert_eq!(
            validate_openrouter_model("openrouter/author/model").unwrap(),
            "author/model"
        );
        assert!(validate_openrouter_model("openrouter/free").is_err());
        assert_eq!(
            validate_openrouter_model("openrouter/author/model:free").unwrap(),
            "author/model:free"
        );
        assert!(validate_openrouter_model("openrouter/author/model/extra").is_err());
        assert!(validate_openrouter_model("openrouter/author/model with spaces").is_err());
    }

    #[test]
    fn openrouter_catalog_excludes_non_text_expired_and_malformed_models() {
        let today = chrono::NaiveDate::from_ymd_opt(2026, 9, 25).unwrap();
        let eligible: OpenRouterModel = serde_json::from_value(serde_json::json!({
            "id": "author/model",
            "name": "Model",
            "architecture": {"modality": "text->text"},
            "pricing": {"prompt": "0", "completion": "0"},
        }))
        .unwrap();
        let image: OpenRouterModel = serde_json::from_value(serde_json::json!({
            "id": "author/image",
            "name": "Image",
            "architecture": {"modality": "image->text"},
            "pricing": {"prompt": "0", "completion": "0"},
        }))
        .unwrap();
        let expired: OpenRouterModel = serde_json::from_value(serde_json::json!({
            "id": "author/expired",
            "name": "Expired",
            "architecture": {"modality": "text->text"},
            "expiration_date": "2026-09-24",
        }))
        .unwrap();
        let malformed_expiration: OpenRouterModel = serde_json::from_value(serde_json::json!({
            "id": "author/unknown",
            "name": "Unknown expiry",
            "architecture": {"modality": "text->text"},
            "expiration_date": "not-a-date",
        }))
        .unwrap();
        assert!(openrouter_model_eligible(&eligible, today));
        assert!(!openrouter_model_eligible(&image, today));
        assert!(!openrouter_model_eligible(&expired, today));
        assert!(!openrouter_model_eligible(&malformed_expiration, today));
        assert!(serde_json::from_str::<OpenRouterModelList>(r#"{"data":null}"#).is_err());
    }

    #[test]
    fn openrouter_catalog_accepts_text_input_from_multimodal_models() {
        let today = chrono::NaiveDate::from_ymd_opt(2026, 9, 25).unwrap();
        let gpt: OpenRouterModel = serde_json::from_value(serde_json::json!({
            "id": "openai/gpt-6-sol",
            "name": "OpenAI: GPT-6 Sol",
            "architecture": {"modality": "text+image+file->text"},
            "pricing": {"prompt": "0.000002", "completion": "0.00001"},
        }))
        .unwrap();
        assert!(openrouter_model_eligible(&gpt, today));
        for modality in ["image->text", "text->image", "textbook->text"] {
            let model: OpenRouterModel = serde_json::from_value(serde_json::json!({
                "id": "author/unsupported",
                "name": "Unsupported",
                "architecture": {"modality": modality},
                "pricing": {"prompt": "0", "completion": "0"},
            }))
            .unwrap();
            assert!(!openrouter_model_eligible(&model, today), "{modality}");
        }
    }

    #[test]
    fn openrouter_catalog_requires_reliable_nonnegative_input_and_output_prices() {
        let today = chrono::NaiveDate::from_ymd_opt(2026, 9, 25).unwrap();
        for pricing in [
            serde_json::json!({}),
            serde_json::json!({"prompt":"0.1"}),
            serde_json::json!({"prompt":"bad","completion":"0.1"}),
            serde_json::json!({"prompt":"NaN","completion":"0.1"}),
            serde_json::json!({"prompt":"Infinity","completion":"0.1"}),
            serde_json::json!({"prompt":"-0.1","completion":"0.1"}),
            serde_json::json!({"prompt":"0.1","completion":"-0.1"}),
        ] {
            let model: OpenRouterModel = serde_json::from_value(serde_json::json!({
                "id":"author/model",
                "name":"Model",
                "architecture":{"modality":"text->text"},
                "pricing":pricing,
            }))
            .unwrap();
            assert!(!openrouter_model_eligible(&model, today), "{pricing}");
        }
        for pricing in [
            serde_json::json!({"prompt":"0","completion":"0"}),
            serde_json::json!({"prompt":"0.0000001","completion":"0.0000002"}),
        ] {
            let model: OpenRouterModel = serde_json::from_value(serde_json::json!({
                "id":"author/model",
                "name":"Model",
                "architecture":{"modality":"text->text"},
                "pricing":pricing,
            }))
            .unwrap();
            assert!(openrouter_model_eligible(&model, today), "{pricing}");
        }
    }

    #[test]
    fn openrouter_catalog_keeps_concrete_free_models_and_raw_id() {
        let today = chrono::NaiveDate::from_ymd_opt(2026, 9, 25).unwrap();
        let free: OpenRouterModel = serde_json::from_value(serde_json::json!({
            "id": "author/model:free",
            "name": "Free model",
            "architecture": {"modality": "text->text"},
            "pricing": {"prompt": "0", "completion": "0"},
        }))
        .unwrap();
        assert!(openrouter_model_eligible(&free, today));
        assert_eq!(
            validate_openrouter_model("openrouter/author/model:free").unwrap(),
            "author/model:free"
        );
        assert!(validate_openrouter_model("openrouter/free").is_err());
    }

    #[test]
    fn openrouter_status_errors_are_actionable_and_redacted() {
        for status in [401, 402, 403, 404, 408, 429, 502, 503] {
            let message = openrouter_status_error(
                reqwest::StatusCode::from_u16(status).expect("valid status"),
            );
            assert!(!message.contains("secret"));
            assert!(!message.contains("response body"));
            assert!(!message.is_empty());
            if status >= 502 {
                assert!(message.contains(&format!("HTTP {status}")));
            }
        }
        assert!(
            openrouter_status_error(reqwest::StatusCode::from_u16(402).unwrap())
                .contains("credits")
        );
    }

    #[tokio::test]
    async fn openrouter_catalog_checks_key_then_requests_user_models_and_shows_costs() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let server = tokio::spawn(async move {
            let mut paths = Vec::new();
            for response_body in [
                r#"{"data":{"limit":10,"limit_remaining":7.5}}"#,
                r#"{"data":[{"id":"author/model","name":"Model","architecture":{"modality":"text->text"},"pricing":{"prompt":"0.0000001","completion":"0.0000002"}},{"id":"openai/gpt-6-sol","name":"OpenAI: GPT-6 Sol","architecture":{"modality":"text+image+file->text"},"pricing":{"prompt":"0.000002","completion":"0.00001"}}]}"#,
            ] {
                let (mut socket, _) = listener.accept().await.unwrap();
                let mut request = Vec::new();
                let mut incoming = [0; 2048];
                loop {
                    let count = socket.read(&mut incoming).await.unwrap();
                    request.extend_from_slice(&incoming[..count]);
                    if request.windows(4).any(|window| window == b"\r\n\r\n") {
                        break;
                    }
                }
                let request = String::from_utf8_lossy(&request);
                let first_line = request.lines().next().unwrap();
                paths.push(first_line.to_owned());
                assert!(request
                    .to_lowercase()
                    .contains("authorization: bearer test-key"));
                socket
                    .write_all(
                        format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                            response_body.len(),
                            response_body
                        )
                        .as_bytes(),
                    )
                    .await
                    .unwrap();
            }
            paths
        });
        let base = format!("http://{address}");
        let models = fetch_openrouter_models(
            &reqwest::Client::new(),
            &format!("{base}/api/v1/key"),
            &format!("{base}/api/v1/models/user"),
            "test-key",
        )
        .await
        .unwrap();
        let paths = server.await.unwrap();
        assert_eq!(paths[0], "GET /api/v1/key HTTP/1.1");
        assert_eq!(paths[1], "GET /api/v1/models/user HTTP/1.1");
        assert_eq!(models.len(), 2);
        assert_eq!(models[0].id, "openrouter/author/model");
        assert_eq!(models[1].id, "openrouter/openai/gpt-6-sol");
        assert_eq!(models[0].is_free, Some(false));
        assert_eq!(serde_json::to_value(&models[0]).unwrap()["isFree"], false);
        assert_eq!(
            serde_json::to_value(&models[0]).unwrap()["accountLimit"],
            "Account remaining $7.5 of $10"
        );
        assert_eq!(
            models[0].pricing.as_deref(),
            Some("$0.10/1M input tokens, $0.20/1M output tokens")
        );
        assert_eq!(
            models[0].account_limit.as_deref(),
            Some("Account remaining $7.5 of $10")
        );
    }

    #[test]
    fn small_paid_model_prices_never_appear_free() {
        let model = serde_json::from_value::<OpenRouterModel>(serde_json::json!({
            "id": "author/small",
            "name": "Small",
            "pricing": {"prompt": "0.000000000001", "completion": "0"}
        }))
        .unwrap();
        let prices = openrouter_prices(&model).unwrap();
        assert_eq!(format_model_price(prices.0), "<$0.01");
        assert_eq!(format_model_price(prices.1), "$0.00");
        assert!(!model_is_free(&model, prices));
        let free = serde_json::from_value::<OpenRouterModel>(serde_json::json!({
            "id": "author/free",
            "name": "Free",
            "pricing": {"prompt": "0", "completion": "0", "request": "0"}
        }))
        .unwrap();
        assert!(model_is_free(&free, openrouter_prices(&free).unwrap()));
    }

    #[test]
    fn non_token_pricing_prevents_a_free_label() {
        for extra in [
            serde_json::json!({"request": "0.01"}),
            serde_json::json!({"internal_reasoning": "0.000001"}),
            serde_json::json!({"overrides": [{"min_prompt_tokens": 10}]}),
            serde_json::json!({"undocumented_charge": "0.01"}),
        ] {
            let mut pricing = serde_json::json!({"prompt": "0", "completion": "0"});
            pricing
                .as_object_mut()
                .unwrap()
                .extend(extra.as_object().unwrap().clone());
            let model = serde_json::from_value::<OpenRouterModel>(serde_json::json!({
                "id": "author/model:free",
                "name": "Potential charges",
                "pricing": pricing
            }))
            .unwrap();
            assert!(has_other_charges(&model));
            assert!(!model_is_free(&model, openrouter_prices(&model).unwrap()));
        }
    }

    #[tokio::test]
    async fn openrouter_authorization_requires_the_exact_current_catalog_entry() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let server = tokio::spawn(async move {
            for index in 0..8 {
                let (mut socket, _) = listener.accept().await.unwrap();
                let mut request = Vec::new();
                let mut buffer = [0; 2048];
                loop {
                    let count = socket.read(&mut buffer).await.unwrap();
                    request.extend_from_slice(&buffer[..count]);
                    if request.windows(4).any(|window| window == b"\r\n\r\n") {
                        break;
                    }
                }
                let request = String::from_utf8_lossy(&request).to_lowercase();
                assert!(request.contains("authorization: bearer test-key"));
                let body = if index % 2 == 0 {
                    r#"{"data":{"limit":10,"limit_remaining":10}}"#
                } else {
                    r#"{"data":[{"id":"author/free:free","name":"Free","architecture":{"modality":"text->text"},"pricing":{"prompt":"0","completion":"0"}},{"id":"author/image","name":"Image","architecture":{"modality":"image->text"},"pricing":{"prompt":"0","completion":"0"}},{"id":"author/expired","name":"Expired","architecture":{"modality":"text->text"},"pricing":{"prompt":"0","completion":"0"},"expiration_date":"2000-01-01"}]}"#
                }.as_bytes();
                socket.write_all(format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                    body.len()
                ).as_bytes()).await.unwrap();
                socket.write_all(body).await.unwrap();
            }
        });
        let base = format!("http://{address}/api/v1");
        let client = reqwest::Client::new();
        for selected in [
            "openrouter/author/paid",
            "openrouter/author/image",
            "openrouter/author/expired",
        ] {
            assert!(authorize_openrouter_model(
                &client,
                &format!("{base}/key"),
                &format!("{base}/models/user"),
                "test-key",
                selected,
            )
            .await
            .is_err());
        }
        assert_eq!(
            authorize_openrouter_model(
                &client,
                &format!("{base}/key"),
                &format!("{base}/models/user"),
                "test-key",
                "openrouter/author/free:free",
            )
            .await
            .unwrap(),
            "author/free:free"
        );
        server.abort();
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

    async fn openrouter_provider_for(
        status: u16,
        body: &[u8],
    ) -> (
        RigOpenRouterProvider,
        JoinHandle<(String, String, serde_json::Value)>,
    ) {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let body = body.to_vec();
        let server = tokio::spawn(async move {
            for (expected_path, response_body) in [
                (
                    "GET /api/v1/key HTTP/1.1",
                    r#"{"data":{"limit":10,"limit_remaining":10}}"#,
                ),
                (
                    "GET /api/v1/models/user HTTP/1.1",
                    r#"{"data":[{"id":"author/model:free","name":"Free","architecture":{"modality":"text->text"},"pricing":{"prompt":"0","completion":"0"}}]}"#,
                ),
            ] {
                let (mut socket, _) = listener.accept().await.unwrap();
                let mut request = Vec::new();
                let mut incoming = [0; 2048];
                loop {
                    let count = socket.read(&mut incoming).await.unwrap();
                    request.extend_from_slice(&incoming[..count]);
                    if request.windows(4).any(|window| window == b"\r\n\r\n") {
                        break;
                    }
                }
                assert_eq!(
                    String::from_utf8_lossy(&request).lines().next().unwrap(),
                    expected_path
                );
                socket
                    .write_all(
                        format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{response_body}",
                            response_body.len()
                        )
                        .as_bytes(),
                    )
                    .await
                    .unwrap();
            }
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut request = Vec::new();
            let mut incoming = [0; 4096];
            loop {
                let count = socket.read(&mut incoming).await.unwrap();
                request.extend_from_slice(&incoming[..count]);
                let Some(headers_end) = request.windows(4).position(|window| window == b"\r\n\r\n")
                else {
                    continue;
                };
                let headers = String::from_utf8_lossy(&request[..headers_end]).to_lowercase();
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
            let headers_end = request
                .windows(4)
                .position(|window| window == b"\r\n\r\n")
                .unwrap();
            let path = String::from_utf8_lossy(&request)
                .lines()
                .next()
                .unwrap()
                .to_owned();
            let headers = String::from_utf8_lossy(&request[..headers_end]).to_lowercase();
            let request_body: serde_json::Value =
                serde_json::from_slice(&request[headers_end + 4..]).unwrap();
            socket
                .write_all(
                    format!(
                        "HTTP/1.1 {status} Test\r\nContent-Type: text/event-stream\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n"
                    )
                    .as_bytes(),
                )
                .await
                .unwrap();
            for chunk in body.chunks(12) {
                socket
                    .write_all(format!("{:x}\r\n", chunk.len()).as_bytes())
                    .await
                    .unwrap();
                socket.write_all(chunk).await.unwrap();
                socket.write_all(b"\r\n").await.unwrap();
            }
            socket.write_all(b"0\r\n\r\n").await.unwrap();
            (path, headers, request_body)
        });
        (
            RigOpenRouterProvider {
                base_url: format!("http://{address}/api/v1"),
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
    async fn zen_gpt_and_claude_use_their_native_streaming_endpoints() {
        for (model, expected_path, expected_auth, body) in [
            (
                "gpt-5.6-terra",
                "POST /v1/responses HTTP/1.1",
                "authorization: bearer test-key",
                concat!(
                    "event: response.output_text.delta\n",
                    "data: {\"type\":\"response.output_text.delta\",\"item_id\":\"msg_1\",\"output_index\":0,\"content_index\":0,\"sequence_number\":1,\"delta\":\"Hello\"}\n\n",
                    "event: response.completed\n",
                    "data: {\"type\":\"response.completed\",\"sequence_number\":2,\"response\":{\"id\":\"resp_1\",\"object\":\"response\",\"created_at\":0,\"model\":\"gpt-5.6-terra\",\"status\":\"completed\",\"output\":[],\"tools\":[],\"usage\":{\"input_tokens\":1,\"output_tokens\":1,\"total_tokens\":2}}}\n\n"
                ),
            ),
            (
                "claude-sonnet-4-6",
                "POST /v1/messages HTTP/1.1",
                "x-api-key: test-key",
                concat!(
                    "event: message_start\n",
                    "data: {\"type\":\"message_start\",\"message\":{\"id\":\"msg_1\",\"type\":\"message\",\"role\":\"assistant\",\"model\":\"claude-sonnet-4-6\",\"content\":[],\"stop_reason\":null,\"stop_sequence\":null,\"usage\":{\"input_tokens\":1,\"output_tokens\":0}}}\n\n",
                    "event: content_block_start\n",
                    "data: {\"type\":\"content_block_start\",\"index\":0,\"content_block\":{\"type\":\"text\",\"text\":\"\"}}\n\n",
                    "event: content_block_delta\n",
                    "data: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"Hello\"}}\n\n",
                    "event: content_block_stop\n",
                    "data: {\"type\":\"content_block_stop\",\"index\":0}\n\n",
                    "event: message_delta\n",
                    "data: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"end_turn\",\"stop_sequence\":null},\"usage\":{\"output_tokens\":1}}\n\n",
                    "event: message_stop\n",
                    "data: {\"type\":\"message_stop\"}\n\n"
                ),
            ),
        ] {
            let (provider, server) = zen_provider_for(200, body.as_bytes()).await;
            let mut events = Vec::new();
            provider
                .stream(
                    TutorRequest {
                        api_key: "test-key".to_owned(),
                        model: model.to_owned(),
                        prompt: "question".to_owned(),
                        history: vec![
                            Message::user("prior question"),
                            Message::assistant("prior answer"),
                        ],
                        cancellation: CancellationToken::new(),
                    },
                    &mut |event| events.push(event),
                )
                .await
                .unwrap();
            let (path, headers, sent) = server.await.unwrap();
            assert_eq!(path, expected_path.to_lowercase());
            assert!(headers.contains(expected_auth));
            assert!(headers.contains("x-opencode-session: gic-tutor"));
            assert_eq!(sent["model"], model);
            assert_eq!(sent["stream"], true);
            assert!(sent.to_string().contains("Socratic"));
            assert!(sent.to_string().contains("prior question"));
            assert!(sent.to_string().contains("prior answer"));
            assert!(matches!(events.first(), Some(ProviderEvent::Text(text)) if text == "Hello"));
            assert!(matches!(events.last(), Some(ProviderEvent::Complete)));
            if model.starts_with("claude-") {
                assert!(headers.contains("anthropic-version: 2023-06-01"));
            }
        }
    }

    async fn zen_provider_for(
        status: u16,
        body: &[u8],
    ) -> (
        RigOpenCodeProvider,
        JoinHandle<(String, String, serde_json::Value)>,
    ) {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let body = body.to_vec();
        let server = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut request = Vec::new();
            let mut incoming = [0; 4096];
            loop {
                let count = socket.read(&mut incoming).await.unwrap();
                request.extend_from_slice(&incoming[..count]);
                if let Some(end) = request.windows(4).position(|window| window == b"\r\n\r\n") {
                    let headers = String::from_utf8_lossy(&request[..end]);
                    let length = headers
                        .lines()
                        .find_map(|line| {
                            let (name, value) = line.split_once(':')?;
                            name.eq_ignore_ascii_case("content-length")
                                .then(|| value.trim().parse::<usize>().ok())
                                .flatten()
                        })
                        .unwrap();
                    if request.len() >= end + 4 + length {
                        break;
                    }
                }
            }
            let end = request
                .windows(4)
                .position(|window| window == b"\r\n\r\n")
                .unwrap();
            let headers = String::from_utf8_lossy(&request[..end]).to_lowercase();
            let path = headers.lines().next().unwrap().to_owned();
            let sent = serde_json::from_slice(&request[end + 4..]).unwrap();
            socket.write_all(format!("HTTP/1.1 {status} Test\r\nContent-Type: text/event-stream\r\nContent-Length: {}\r\nConnection: close\r\n\r\n", body.len()).as_bytes()).await.unwrap();
            socket.write_all(&body).await.unwrap();
            (path, headers, sent)
        });
        (
            RigOpenCodeProvider {
                base_url: format!("http://{address}/v1"),
            },
            server,
        )
    }

    #[tokio::test]
    async fn zen_native_routes_redact_http_errors_and_reject_incomplete_streams() {
        for model in ["gpt-5.6-terra", "claude-sonnet-4-6"] {
            for status in [401, 429] {
                let (provider, server) =
                    zen_provider_for(status, b"{\"error\":\"provider-body-secret\"}").await;
                let mut events = Vec::new();
                let result = provider
                    .stream(
                        TutorRequest {
                            api_key: "test-key-secret".to_owned(),
                            model: model.to_owned(),
                            prompt: "question".to_owned(),
                            history: Vec::new(),
                            cancellation: CancellationToken::new(),
                        },
                        &mut |event| events.push(event),
                    )
                    .await;
                let (_, _, _) = server.await.unwrap();
                let message = result.unwrap_err();
                assert_eq!(
                    message,
                    safe_error(reqwest::StatusCode::from_u16(status).unwrap())
                );
                assert!(!message.contains("provider-body-secret"));
                assert!(!message.contains("test-key-secret"));
                assert!(events.is_empty());
            }
            let (provider, server) =
                zen_provider_for(200, b"event: ping\ndata: {\"type\":\"ping\"}\n\n").await;
            let mut events = Vec::new();
            let result = provider
                .stream(
                    TutorRequest {
                        api_key: "test-key".to_owned(),
                        model: model.to_owned(),
                        prompt: "question".to_owned(),
                        history: Vec::new(),
                        cancellation: CancellationToken::new(),
                    },
                    &mut |event| events.push(event),
                )
                .await;
            server.await.unwrap();
            assert!(result.is_err(), "{model}");
            assert!(!events
                .iter()
                .any(|event| matches!(event, ProviderEvent::Complete)));
        }
    }

    #[tokio::test]
    async fn zen_native_routes_reject_provider_stream_errors() {
        for (model, body) in [
            (
                "gpt-5.6-terra",
                "event: response.failed\ndata: {\"type\":\"response.failed\",\"error\":{\"message\":\"provider-body-secret\"}}\n\n",
            ),
            (
                "claude-sonnet-4-6",
                "event: error\ndata: {\"type\":\"error\",\"error\":{\"type\":\"overloaded_error\",\"message\":\"provider-body-secret\"}}\n\n",
            ),
        ] {
            let (provider, server) = zen_provider_for(200, body.as_bytes()).await;
            let mut events = Vec::new();
            let result = provider
                .stream(
                    TutorRequest {
                        api_key: "test-key-secret".to_owned(),
                        model: model.to_owned(),
                        prompt: "question".to_owned(),
                        history: Vec::new(),
                        cancellation: CancellationToken::new(),
                    },
                    &mut |event| events.push(event),
                )
                .await;
            server.await.unwrap();
            let message = result.unwrap_err();
            assert!(!message.contains("provider-body-secret"));
            assert!(!message.contains("test-key-secret"));
            assert!(
                !events
                    .iter()
                    .any(|event| matches!(event, ProviderEvent::Complete))
            );
        }
    }

    #[tokio::test]
    async fn zen_token_limit_does_not_complete_the_tutor_answer() {
        for (model, body) in [
            (
                "gpt-5.6-terra",
                concat!(
                    "event: response.output_text.delta\n",
                    "data: {\"type\":\"response.output_text.delta\",\"item_id\":\"msg_1\",\"output_index\":0,\"content_index\":0,\"sequence_number\":1,\"delta\":\"Partial\"}\n\n",
                    "event: response.incomplete\n",
                    "data: {\"type\":\"response.incomplete\",\"sequence_number\":2,\"response\":{\"id\":\"resp_1\",\"object\":\"response\",\"created_at\":0,\"model\":\"gpt-5.6-terra\",\"status\":\"incomplete\",\"incomplete_details\":{\"reason\":\"max_output_tokens\"},\"output\":[],\"tools\":[],\"usage\":{\"input_tokens\":1,\"output_tokens\":1,\"total_tokens\":2}}}\n\n"
                ),
            ),
            (
                "claude-sonnet-4-6",
                concat!(
                    "event: message_start\n",
                    "data: {\"type\":\"message_start\",\"message\":{\"id\":\"msg_1\",\"type\":\"message\",\"role\":\"assistant\",\"model\":\"claude-sonnet-4-6\",\"content\":[],\"stop_reason\":null,\"stop_sequence\":null,\"usage\":{\"input_tokens\":1,\"output_tokens\":0}}}\n\n",
                    "event: content_block_start\n",
                    "data: {\"type\":\"content_block_start\",\"index\":0,\"content_block\":{\"type\":\"text\",\"text\":\"\"}}\n\n",
                    "event: content_block_delta\n",
                    "data: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"Partial\"}}\n\n",
                    "event: content_block_stop\n",
                    "data: {\"type\":\"content_block_stop\",\"index\":0}\n\n",
                    "event: message_delta\n",
                    "data: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"max_tokens\",\"stop_sequence\":null},\"usage\":{\"output_tokens\":1}}\n\n",
                    "event: message_stop\n",
                    "data: {\"type\":\"message_stop\"}\n\n"
                ),
            ),
        ] {
            let (provider, server) = zen_provider_for(200, body.as_bytes()).await;
            let mut events = Vec::new();
            let result = provider
                .stream(
                    TutorRequest {
                        api_key: "test-key".to_owned(),
                        model: model.to_owned(),
                        prompt: "question".to_owned(),
                        history: Vec::new(),
                        cancellation: CancellationToken::new(),
                    },
                    &mut |event| events.push(event),
                )
                .await;
            server.await.unwrap();
            assert!(result.is_err(), "{model}");
            assert!(!events.iter().any(|event| matches!(event, ProviderEvent::Complete)));
        }
    }

    #[tokio::test]
    async fn zen_native_routes_cancel_stalled_streams() {
        for model in ["gpt-5.6-terra", "claude-sonnet-4-6"] {
            let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
            let address = listener.local_addr().unwrap();
            let server = tokio::spawn(async move {
                let (mut socket, _) = listener.accept().await.unwrap();
                let mut incoming = [0; 4096];
                let _ = socket.read(&mut incoming).await.unwrap();
                socket.write_all(b"HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nTransfer-Encoding: chunked\r\n\r\n").await.unwrap();
                std::future::pending::<()>().await;
            });
            let provider = RigOpenCodeProvider {
                base_url: format!("http://{address}/v1"),
            };
            let cancellation = CancellationToken::new();
            let cancel = cancellation.clone();
            let request = tokio::spawn(async move {
                let mut events = Vec::new();
                let result = provider
                    .stream(
                        TutorRequest {
                            api_key: "test-key".to_owned(),
                            model: model.to_owned(),
                            prompt: "question".to_owned(),
                            history: Vec::new(),
                            cancellation,
                        },
                        &mut |event| events.push(event),
                    )
                    .await;
                (result, events)
            });
            tokio::time::sleep(std::time::Duration::from_millis(20)).await;
            cancel.cancel();
            let (result, events) = request.await.unwrap();
            assert!(result.is_ok());
            assert!(matches!(events.as_slice(), [ProviderEvent::Cancelled]));
            server.abort();
        }
    }

    #[tokio::test]
    async fn rig_openrouter_streams_to_openrouter_contract_and_reports_terminal_errors() {
        let body = concat!(
            ": keep-alive\n\n",
            "data: {\"id\":\"chatcmpl-1\",\"object\":\"chat.completion.chunk\",\"created\":1,\"model\":\"author/model:free\",\"choices\":[{\"index\":0,\"delta\":{\"content\":\"hi\"},\"finish_reason\":null}]}\n\n",
            "data: {\"id\":\"chatcmpl-1\",\"object\":\"chat.completion.chunk\",\"created\":1,\"model\":\"author/model:free\",\"choices\":[],\"usage\":{\"prompt_tokens\":1,\"completion_tokens\":0,\"total_tokens\":1}}\n\n",
            "data: {\"id\":\"chatcmpl-1\",\"object\":\"chat.completion.chunk\",\"created\":1,\"model\":\"author/model:free\",\"choices\":[{\"delta\":{},\"finish_reason\":\"stop\"}],\"usage\":{\"prompt_tokens\":1,\"completion_tokens\":1,\"total_tokens\":2}}\n\n",
            "data: [DONE]\n\n"
        );
        let (provider, server) = openrouter_provider_for(200, body.as_bytes()).await;
        let mut events = Vec::new();
        provider
            .stream(
                TutorRequest {
                    api_key: "test-key".to_owned(),
                    model: "author/model:free".to_owned(),
                    prompt: "question".to_owned(),
                    history: vec![
                        Message::user("prior question"),
                        Message::assistant("prior answer"),
                    ],
                    cancellation: CancellationToken::new(),
                },
                &mut |event| events.push(event),
            )
            .await
            .unwrap();
        let (path, headers, sent) = server.await.unwrap();
        assert_eq!(path, "POST /api/v1/chat/completions HTTP/1.1");
        assert!(headers.contains("authorization: bearer test-key"));
        assert!(!headers.contains("x-opencode-session"));
        assert_eq!(sent["model"], "author/model:free");
        assert_eq!(sent["stream"], true);
        assert!(sent.get("tools").is_none());
        assert_eq!(sent["messages"][0]["role"], "system");
        assert_eq!(sent["messages"][0]["content"][0]["text"], TUTOR_POLICY);
        assert_eq!(sent["messages"][1]["content"], "prior question");
        assert_eq!(sent["messages"][2]["content"][0]["text"], "prior answer");
        assert_eq!(sent["messages"][3]["content"], "question");
        assert!(matches!(events.first(), Some(ProviderEvent::Text(text)) if text == "hi"));
        assert!(matches!(events.last(), Some(ProviderEvent::Complete)));
    }

    #[tokio::test]
    async fn rig_openrouter_rejects_an_ineligible_model_before_completion() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let server = tokio::spawn(async move {
            let mut paths = Vec::new();
            while let Ok(Ok((mut socket, _))) =
                tokio::time::timeout(std::time::Duration::from_millis(300), listener.accept()).await
            {
                let mut request = Vec::new();
                let mut incoming = [0; 2048];
                loop {
                    let count = socket.read(&mut incoming).await.unwrap();
                    request.extend_from_slice(&incoming[..count]);
                    if request.windows(4).any(|window| window == b"\r\n\r\n") {
                        break;
                    }
                }
                let path = String::from_utf8_lossy(&request)
                    .lines()
                    .next()
                    .unwrap()
                    .to_owned();
                let body = if path == "GET /api/v1/key HTTP/1.1" {
                    r#"{"data":{"limit":10,"limit_remaining":10}}"#
                } else if path == "GET /api/v1/models/user HTTP/1.1" {
                    r#"{"data":[{"id":"author/allowed:free","name":"Allowed","architecture":{"modality":"text->text"},"pricing":{"prompt":"0","completion":"0"}}]}"#
                } else if path == "POST /api/v1/chat/completions HTTP/1.1" {
                    "data: {\"id\":\"chatcmpl-1\",\"object\":\"chat.completion.chunk\",\"created\":1,\"model\":\"author/ineligible\",\"choices\":[{\"index\":0,\"delta\":{\"content\":\"wrong\"},\"finish_reason\":\"stop\"}]}\n\ndata: [DONE]\n\n"
                } else {
                    panic!("unexpected provider path: {path}");
                };
                let content_type = if path.starts_with("POST") {
                    "text/event-stream"
                } else {
                    "application/json"
                };
                socket
                    .write_all(
                        format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                            body.len()
                        )
                        .as_bytes(),
                    )
                    .await
                    .unwrap();
                paths.push(path);
                if paths.len() == 3 {
                    break;
                }
            }
            paths
        });
        let provider = RigOpenRouterProvider {
            base_url: format!("http://{address}/api/v1"),
        };
        let result = provider
            .stream(
                TutorRequest {
                    api_key: "synthetic-key".to_owned(),
                    model: "author/ineligible".to_owned(),
                    prompt: "question".to_owned(),
                    history: Vec::new(),
                    cancellation: CancellationToken::new(),
                },
                &mut |_| {},
            )
            .await;
        let paths = server.await.unwrap();
        assert!(result.is_err());
        assert_eq!(
            paths,
            [
                "GET /api/v1/key HTTP/1.1",
                "GET /api/v1/models/user HTTP/1.1"
            ]
        );
    }

    #[tokio::test]
    async fn rig_openrouter_does_not_complete_on_error_or_incomplete_stream() {
        for (index, body) in [
            concat!(
                "data: {\"choices\":[{\"delta\":{\"content\":\"partial\"},\"finish_reason\":null}]}\n\n",
                "data: {\"error\":{\"message\":\"sensitive provider detail\"},\"choices\":[],\"finish_reason\":\"error\"}\n\n"
            ),
            "data: {\"choices\":[{\"delta\":{\"content\":\"partial\"},\"finish_reason\":\"error\"}]}\n\n",
            "data: {\"choices\":[{\"delta\":{\"content\":\"partial\"},\"finish_reason\":null}]}\n\n",
            "data: [DONE]\n\n",
        ]
        .into_iter()
        .enumerate()
        {
            let (provider, server) = openrouter_provider_for(200, body.as_bytes()).await;
            let mut events = Vec::new();
            let result = provider
                .stream(
                    TutorRequest {
                        api_key: "test-key".to_owned(),
                        model: "author/model:free".to_owned(),
                        prompt: "question".to_owned(),
                        history: Vec::new(),
                        cancellation: CancellationToken::new(),
                    },
                    &mut |event| events.push(event),
                )
                .await;
            let (_, headers, _) = server.await.unwrap();
            assert!(headers.contains("authorization: bearer test-key"));
            assert!(result.is_err(), "fixture {index} unexpectedly completed");
            assert!(!result.unwrap_err().contains("sensitive provider detail"));
            assert!(!events.iter().any(|event| matches!(event, ProviderEvent::Complete)));
        }
    }

    #[tokio::test]
    async fn rig_openrouter_http_errors_are_redacted_and_actionable() {
        for (status, expected) in [
            (401, "HTTP 401"),
            (402, "HTTP 402"),
            (403, "HTTP 403"),
            (404, "HTTP 404"),
            (429, "HTTP 429"),
            (502, "HTTP 502"),
            (503, "HTTP 503"),
        ] {
            let (provider, server) =
                openrouter_provider_for(status, b"{\"error\":\"provider-body-secret\"}").await;
            let result = provider
                .stream(
                    TutorRequest {
                        api_key: "test-key-secret".to_owned(),
                        model: "author/model:free".to_owned(),
                        prompt: "question".to_owned(),
                        history: Vec::new(),
                        cancellation: CancellationToken::new(),
                    },
                    &mut |_| {},
                )
                .await;
            let (_, headers, _) = server.await.unwrap();
            let message = result.unwrap_err();
            assert!(message.contains(expected), "{message}");
            assert!(!message.contains("provider-body-secret"), "{message}");
            assert!(!message.contains("test-key-secret"), "{message}");
            assert!(headers.contains("authorization: bearer test-key-secret"));
        }
    }

    #[tokio::test]
    async fn rig_openrouter_cancellation_interrupts_a_stalled_stream() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let server = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut request = Vec::new();
            let mut incoming = [0; 4096];
            loop {
                let count = socket.read(&mut incoming).await.unwrap();
                request.extend_from_slice(&incoming[..count]);
                if request.windows(4).any(|window| window == b"\r\n\r\n") {
                    break;
                }
            }
            socket
                .write_all(
                    b"HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nTransfer-Encoding: chunked\r\n\r\n",
                )
                .await
                .unwrap();
            std::future::pending::<()>().await;
        });
        let provider = RigOpenRouterProvider {
            base_url: format!("http://{address}/api/v1"),
        };
        let cancellation = CancellationToken::new();
        let cancel = cancellation.clone();
        let request = tokio::spawn(async move {
            let mut events = Vec::new();
            let result = provider
                .stream(
                    TutorRequest {
                        api_key: "test-key".to_owned(),
                        model: "author/model:free".to_owned(),
                        prompt: "question".to_owned(),
                        history: Vec::new(),
                        cancellation,
                    },
                    &mut |event| events.push(event),
                )
                .await;
            (result, events)
        });
        tokio::time::sleep(std::time::Duration::from_millis(20)).await;
        cancel.cancel();
        let (result, events) = request.await.unwrap();
        assert!(result.is_ok());
        assert!(matches!(events.as_slice(), [ProviderEvent::Cancelled]));
        server.abort();
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
                let body = r#"{"data":[{"id":"gpt-6-luna","name":"GPT 6 Luna"},{"id":"claude-sonnet-4-6","name":"Claude Sonnet"},{"id":"big-pickle","name":"Big Pickle"},{"id":"space-bunny-free","name":"Space Bunny Free"},{"id":"gemini-3-flash","name":"Gemini"},{"id":"jev-1.13","name":"Jev"},{"id":"unknown-model","name":"Unknown"}]}"#;
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
        assert_eq!(models.len(), 4);
        assert_eq!(models[0].id, "opencode-zen/gpt-6-luna");
        assert_eq!(models[1].id, "opencode-zen/claude-sonnet-4-6");
        assert_eq!(models[2].id, "opencode-zen/big-pickle");
        assert_eq!(models[3].id, "opencode-zen/space-bunny-free");
    }

    #[test]
    fn only_documented_zen_models_are_enabled() {
        assert!(validate_model("opencode-zen/big-pickle").is_ok());
        assert_eq!(
            validate_model("opencode-zen/space-bunny-free").unwrap(),
            "space-bunny-free"
        );
        assert_eq!(
            validate_model("opencode-zen/gpt-5.6-terra").unwrap(),
            "gpt-5.6-terra"
        );
        assert_eq!(
            validate_model("opencode-zen/claude-sonnet-4-6").unwrap(),
            "claude-sonnet-4-6"
        );
        assert!(validate_model("opencode-zen/gpt-999").is_err());
        assert!(validate_model("opencode-zen/claude-unknown").is_err());
        assert!(validate_model("opencode-zen/gemini-3-flash").is_err());
        assert!(validate_model("opencode-zen/grok-future").is_err());
        assert!(validate_model("openrouter/big-pickle").is_err());
        assert!(validate_model("opencode-go/big-pickle").is_err());
        assert!(validate_model("openai-codex/big-pickle").is_err());
        assert!(validate_model("big-pickle").is_err());
        assert!(validate_model("gpt-6-luna").is_err());
    }

    #[test]
    fn zen_route_requires_exact_documented_model_ids() {
        for model in [
            "gpt-6-astra",
            "gpt-6-sol",
            "gpt-5.6-luna",
            "gpt-5.5-pro",
            "gpt-5.1-codex-max",
            "gpt-5-nano",
        ] {
            assert_eq!(zen_route(model), Some(ZenRoute::Responses), "{model}");
        }
        for model in [
            "claude-fable-5-1",
            "claude-opus-5-5",
            "claude-opus-4-8",
            "claude-sonnet-5",
            "claude-haiku-4-5",
        ] {
            assert_eq!(zen_route(model), Some(ZenRoute::Messages), "{model}");
        }
        for model in [
            "gpt-999",
            "claude-sonnet-future",
            "gemini-3-flash",
            "grok-future",
            "jev-1.13",
            "unknown-model",
            "test-model",
        ] {
            assert_eq!(zen_route(model), None, "{model}");
        }
    }

    #[test]
    fn documented_text_families_use_their_zen_routes() {
        for model in [
            "big-pickle",
            "deepseek-v4-flash",
            "glm-5.3",
            "kimi-k3",
            "mimo-v2.5-free",
            "minimax-m3",
            "nemotron-3-ultra-free",
            "qwen3.8-max",
        ] {
            assert_eq!(zen_route(model), Some(ZenRoute::ChatCompletions), "{model}");
        }
        for model in [
            "gpt-5.6-terra",
            "grok-4.7",
            "muse-spark-1.3",
            "muse-spark-1.3-contributor-free",
        ] {
            assert_eq!(zen_route(model), Some(ZenRoute::Responses), "{model}");
        }
        for model in ["claude-sonnet-4-6", "qwen3.6-plus", "qwen3.8-flash"] {
            assert_eq!(zen_route(model), Some(ZenRoute::Messages), "{model}");
        }
        for model in [
            "jev-1.13",
            "test",
            "test-novita-dsf4.1",
            "muse-spark-1.2-contributor-free",
        ] {
            assert_eq!(zen_route(model), None, "{model}");
        }
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
    let (sketch, history) = parse_context(&context);
    let prompt = format!("Sketch and preview context:\n{sketch}\n\nStudent question: {question}");
    let result = if model.starts_with("openrouter/") {
        let api_key = credentials.with_openrouter_key(|key| key.to_owned())?;
        let model = validate_openrouter_model(&model)?.to_owned();
        let provider = RigOpenRouterProvider {
            base_url: "https://openrouter.ai/api/v1".to_owned(),
        };
        stream_with_provider(
            app,
            &provider,
            TutorRequest {
                api_key,
                model,
                prompt,
                history,
                cancellation,
            },
            &request_id,
        )
        .await
    } else {
        let api_key = credentials.with_opencode_key(|key| key.to_owned())?;
        let provider = RigOpenCodeProvider {
            base_url: ZEN_URL.trim_end_matches("/chat/completions").to_owned(),
        };
        stream_with_provider(
            app,
            &provider,
            TutorRequest {
                api_key,
                model,
                prompt,
                history,
                cancellation,
            },
            &request_id,
        )
        .await
    };
    result
}

async fn stream_with_provider(
    app: &AppHandle,
    provider: &impl TutorProvider,
    request: TutorRequest,
    request_id: &str,
) -> Result<(), String> {
    let result = provider
        .stream(request, &mut |event| {
            let event = match event {
                ProviderEvent::Text(text) => AgentEvent::Text {
                    request_id: request_id.to_owned(),
                    text,
                },
                ProviderEvent::Complete => AgentEvent::Complete {
                    request_id: request_id.to_owned(),
                },
                ProviderEvent::Cancelled => AgentEvent::Cancelled {
                    request_id: request_id.to_owned(),
                },
            };
            let _ = app.emit(EVENT_NAME, event);
        })
        .await;
    if let Err(message) = &result {
        let _ = app.emit(
            EVENT_NAME,
            AgentEvent::Error {
                request_id: request_id.to_owned(),
                message: message.clone(),
            },
        );
    }
    result
}
