// ABOUTME: Loads static native tutor capabilities from the desktop JSON manifest.
// ABOUTME: Provides route, verification, and bundled Codex lookups without provider calls.

use serde::Deserialize;
use std::sync::OnceLock;

const MANIFEST: &str = include_str!("../model-capabilities.json");

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum Route {
    ChatCompletions,
    Responses,
    Messages,
    GeminiStreamGenerateContent,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModelCapabilities {
    routes: Vec<RouteCapability>,
    reference_tool_verification: ReferenceToolVerification,
    codex: CodexCatalog,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RouteCapability {
    provider: String,
    family: Route,
    #[serde(default = "default_true")]
    callable: bool,
    #[serde(default)]
    matches_all_model_ids: bool,
    model_ids: Vec<String>,
}

const fn default_true() -> bool {
    true
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReferenceToolVerification {
    verified_model_ids: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CodexCatalog {
    models: Vec<CodexModel>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CodexModel {
    pub(crate) id: String,
    pub(crate) name: String,
    pub(crate) beginner_default: bool,
    pub(crate) reference_tools_verified: bool,
}

fn manifest() -> &'static ModelCapabilities {
    static PARSED: OnceLock<ModelCapabilities> = OnceLock::new();
    PARSED.get_or_init(|| {
        serde_json::from_str(MANIFEST)
            .expect("model-capabilities.json must contain a valid capability manifest")
    })
}

pub(crate) fn route_for(qualified_model: &str) -> Option<Route> {
    let (provider, model_id) = qualified_model.split_once('/')?;
    (!model_id.is_empty()).then_some(()).and_then(|()| {
        manifest().routes.iter().find_map(|route| {
            (route.callable
                && route.provider == provider
                && (route.matches_all_model_ids || route.model_ids.iter().any(|id| id == model_id)))
            .then_some(route.family)
        })
    })
}

pub(crate) fn reference_tools_verified(qualified_model: &str) -> bool {
    manifest()
        .reference_tool_verification
        .verified_model_ids
        .iter()
        .any(|id| id == qualified_model)
        || codex_models().iter().any(|model| {
            model.reference_tools_verified
                && qualified_model == format!("openai-codex/{}", model.id)
        })
}

pub(crate) fn codex_models() -> &'static [CodexModel] {
    &manifest().codex.models
}
