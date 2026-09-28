// ABOUTME: Loads static native tutor capabilities from the desktop JSON manifest.
// ABOUTME: Provides route, verification, and bundled Codex lookups without provider calls.

use serde::Deserialize;
use std::{collections::HashSet, sync::OnceLock};

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
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ModelCapabilities {
    schema_version: u32,
    #[serde(rename = "metadata")]
    _metadata: serde_json::Value,
    routes: Vec<RouteCapability>,
    #[serde(rename = "observedUnsupported")]
    _observed_unsupported: serde_json::Value,
    #[serde(rename = "routeSmokeChecks")]
    _route_smoke_checks: serde_json::Value,
    reference_tool_verification: ReferenceToolVerification,
    codex: CodexCatalog,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RouteCapability {
    provider: String,
    family: Route,
    #[serde(rename = "path")]
    _path: String,
    #[serde(rename = "catalogStatus")]
    _catalog_status: String,
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
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ReferenceToolVerification {
    verified_model_ids: Vec<String>,
    #[serde(rename = "notSelectableDespiteSuccessfulEarlierProbe")]
    _not_selectable_despite_successful_earlier_probe: serde_json::Value,
    #[serde(rename = "unverifiedProbeResults")]
    _unverified_probe_results: serde_json::Value,
    #[serde(rename = "goStatus")]
    _go_status: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CodexCatalog {
    #[serde(rename = "catalogStatus")]
    _catalog_status: String,
    models: Vec<CodexModel>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CodexModel {
    pub(crate) id: String,
    pub(crate) name: String,
    pub(crate) beginner_default: bool,
    pub(crate) reference_tools_verified: bool,
}

impl ModelCapabilities {
    fn route_for(&self, qualified_model: &str) -> Option<Route> {
        let (provider, model_id) = qualified_model.split_once('/')?;
        if model_id.is_empty() {
            return None;
        }
        self.routes.iter().find_map(|route| {
            (route.callable
                && route.provider == provider
                && (route.matches_all_model_ids || route.model_ids.iter().any(|id| id == model_id)))
            .then_some(route.family)
        })
    }

    fn validate(&self) -> Result<(), String> {
        if self.schema_version != 1 {
            return Err("Unsupported model capability schema version.".to_owned());
        }
        let mut routes = HashSet::new();
        let mut wildcards = HashSet::new();
        for route in &self.routes {
            if !matches!(
                route.provider.as_str(),
                "opencode-zen" | "opencode-go" | "openrouter"
            ) {
                return Err(format!("Unsupported model provider: {}.", route.provider));
            }
            if route.family == Route::GeminiStreamGenerateContent && route.callable {
                return Err("Gemini has no callable native tutor adapter.".to_owned());
            }
            if route.matches_all_model_ids {
                if route.provider != "openrouter"
                    || !route.model_ids.is_empty()
                    || !wildcards.insert(route.provider.as_str())
                {
                    return Err(format!("Conflicting wildcard route: {}.", route.provider));
                }
            } else if route.model_ids.is_empty() {
                return Err(format!("Route has no model IDs: {}.", route.provider));
            }
            for id in &route.model_ids {
                if id.is_empty()
                    || id.trim() != id
                    || !routes.insert((route.provider.as_str(), id.as_str()))
                {
                    return Err(format!(
                        "Invalid or duplicate route: {}/{}.",
                        route.provider, id
                    ));
                }
            }
        }
        if routes
            .iter()
            .any(|(provider, _)| wildcards.contains(provider))
        {
            return Err("Wildcard route conflicts with explicit model IDs.".to_owned());
        }
        let mut verified = HashSet::new();
        for id in &self.reference_tool_verification.verified_model_ids {
            if !verified.insert(id)
                || !(id.starts_with("opencode-zen/") || id.starts_with("openrouter/"))
                || self.route_for(id).is_none()
            {
                return Err(format!("Invalid verified model: {id}."));
            }
        }
        let mut codex_ids = HashSet::new();
        let mut defaults = 0;
        for model in &self.codex.models {
            if model.id.is_empty()
                || model.name.trim().is_empty()
                || !codex_ids.insert(model.id.as_str())
            {
                return Err(format!("Invalid or duplicate Codex model: {}.", model.id));
            }
            defaults += usize::from(model.beginner_default);
        }
        if defaults != 1 {
            return Err("Exactly one Codex beginner default is required.".to_owned());
        }
        Ok(())
    }
}

fn parse_manifest(source: &str) -> Result<ModelCapabilities, String> {
    let capabilities: ModelCapabilities =
        serde_json::from_str(source).map_err(|error| error.to_string())?;
    capabilities.validate()?;
    Ok(capabilities)
}

fn manifest() -> &'static ModelCapabilities {
    static PARSED: OnceLock<ModelCapabilities> = OnceLock::new();
    PARSED.get_or_init(|| {
        parse_manifest(MANIFEST).expect("model-capabilities.json must contain valid capabilities")
    })
}

pub(crate) fn route_for(qualified_model: &str) -> Option<Route> {
    manifest().route_for(qualified_model)
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

#[cfg(test)]
mod tests {
    use super::parse_manifest;
    use serde_json::{json, Value};

    fn fixture() -> Value {
        json!({
            "schemaVersion": 1,
            "metadata": {},
            "routes": [
                {
                    "provider": "opencode-zen",
                    "family": "responses",
                    "path": "/responses",
                    "catalogStatus": "test",
                    "modelIds": ["model"]
                },
                {
                    "provider": "openrouter",
                    "family": "chatCompletions",
                    "path": "/chat/completions",
                    "catalogStatus": "test",
                    "matchesAllModelIds": true,
                    "modelIds": []
                }
            ],
            "observedUnsupported": [],
            "routeSmokeChecks": [],
            "referenceToolVerification": {
                "verifiedModelIds": ["opencode-zen/model"],
                "notSelectableDespiteSuccessfulEarlierProbe": [],
                "unverifiedProbeResults": [],
                "goStatus": ""
            },
            "codex": {
                "catalogStatus": "test",
                "models": [{
                    "id": "codex",
                    "name": "Codex",
                    "beginnerDefault": true,
                    "referenceToolsVerified": true
                }]
            }
        })
    }

    #[test]
    fn accepts_consistent_provider_capabilities() {
        assert!(parse_manifest(&fixture().to_string()).is_ok());
    }

    #[test]
    fn rejects_unknown_schema_fields_and_versions() {
        let mut version = fixture();
        version["schemaVersion"] = json!(2);
        assert!(parse_manifest(&version.to_string()).is_err());

        let mut typo = fixture();
        typo["routes"][0]["modelIdz"] = json!(["another"]);
        assert!(parse_manifest(&typo.to_string()).is_err());
    }

    #[test]
    fn rejects_overlapping_routes_and_unverified_provider_types() {
        let mut duplicate = fixture();
        duplicate["routes"][0]["modelIds"] = json!(["model", "model"]);
        assert!(parse_manifest(&duplicate.to_string()).is_err());

        let mut overlap = fixture();
        overlap["routes"].as_array_mut().unwrap().push(json!({
            "provider": "opencode-zen",
            "family": "messages",
            "path": "/messages",
            "catalogStatus": "test",
            "modelIds": ["model"]
        }));
        assert!(parse_manifest(&overlap.to_string()).is_err());

        let mut wildcard = fixture();
        wildcard["routes"].as_array_mut().unwrap().push(json!({
            "provider": "openrouter",
            "family": "messages",
            "path": "/messages",
            "catalogStatus": "test",
            "modelIds": ["other"]
        }));
        assert!(parse_manifest(&wildcard.to_string()).is_err());

        let mut provider = fixture();
        provider["routes"][0]["provider"] = json!("unknown-provider");
        assert!(parse_manifest(&provider.to_string()).is_err());

        let mut gemini = fixture();
        gemini["routes"][0]["family"] = json!("geminiStreamGenerateContent");
        assert!(parse_manifest(&gemini.to_string()).is_err());
    }

    #[test]
    fn rejects_unroutable_verifications_and_ambiguous_codex_defaults() {
        let mut missing = fixture();
        missing["referenceToolVerification"]["verifiedModelIds"] = json!(["opencode-zen/missing"]);
        assert!(parse_manifest(&missing.to_string()).is_err());

        let mut go = fixture();
        go["referenceToolVerification"]["verifiedModelIds"] = json!(["opencode-go/model"]);
        assert!(parse_manifest(&go.to_string()).is_err());

        let mut duplicate = fixture();
        duplicate["referenceToolVerification"]["verifiedModelIds"] =
            json!(["opencode-zen/model", "opencode-zen/model"]);
        assert!(parse_manifest(&duplicate.to_string()).is_err());

        let mut codex = fixture();
        codex["codex"]["models"]
            .as_array_mut()
            .unwrap()
            .push(json!({
                "id": "other",
                "name": "Other",
                "beginnerDefault": true,
                "referenceToolsVerified": true
            }));
        assert!(parse_manifest(&codex.to_string()).is_err());

        let mut duplicate_codex = fixture();
        duplicate_codex["codex"]["models"]
            .as_array_mut()
            .unwrap()
            .push(json!({
                "id": "codex",
                "name": "Codex again",
                "beginnerDefault": false,
                "referenceToolsVerified": false
            }));
        assert!(parse_manifest(&duplicate_codex.to_string()).is_err());
    }
}
