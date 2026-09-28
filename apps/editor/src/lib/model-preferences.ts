// ABOUTME: Loads and saves enabled tutor model IDs and derives picker visibility.
// ABOUTME: Keeps explicit selections independent of transient provider catalogs.

import type { ApplicationSettings } from "./application-settings.ts";
import type { OpencodeModel } from "./desktop-host.ts";

const ENABLED_MODEL_IDS_KEY = "gic.tutor.enabled-model-ids";
const SELECTED_MODEL_ID_KEY = "gic.tutor.selected-model";

export function loadEnabledModelIds(
	settings: ApplicationSettings,
	catalog: readonly OpencodeModel[] = [],
): string[] {
	const saved = settings.getItem(ENABLED_MODEL_IDS_KEY);
	if (saved !== null) {
		try {
			const parsed: unknown = JSON.parse(saved);
			if (Array.isArray(parsed)) {
				return [...new Set(parsed.filter(isNonEmptyString))];
			}
		} catch {
			return [];
		}
		return [];
	}

	const beginner = catalog.find(
		(model) =>
			model.id.startsWith("openai-codex/") && model.beginnerDefault === true,
	);
	return beginner === undefined ? [] : [beginner.id];
}

export function saveEnabledModelIds(
	settings: ApplicationSettings,
	enabledModelIds: readonly string[],
): void {
	const enabled = [...new Set(enabledModelIds.filter(isNonEmptyString))];
	settings.setItem(ENABLED_MODEL_IDS_KEY, JSON.stringify(enabled));
	const selected = loadSelectedModelId(settings);
	if (selected && !enabled.includes(selected))
		saveSelectedModelId(settings, "");
}

export function loadSelectedModelId(settings: ApplicationSettings): string {
	return settings.getItem(SELECTED_MODEL_ID_KEY) ?? "";
}

export function saveSelectedModelId(
	settings: ApplicationSettings,
	selectedModelId: string,
): void {
	settings.setItem(SELECTED_MODEL_ID_KEY, selectedModelId);
}

export function deriveVisibleModels(
	catalog: readonly OpencodeModel[],
	enabledModelIds: readonly string[],
): OpencodeModel[] {
	const enabled = new Set(enabledModelIds);
	return catalog.filter(
		(model) =>
			enabled.has(model.id) &&
			(model.id.startsWith("opencode-zen/") ||
				model.id.startsWith("opencode-go/") ||
				model.id.startsWith("openrouter/") ||
				model.id.startsWith("openai-codex/")),
	);
}

export function agentModelProvider(model: OpencodeModel): string {
	return model.id.startsWith("opencode-zen/")
		? "OpenCode Zen"
		: model.id.startsWith("opencode-go/")
			? "OpenCode Go"
			: model.id.startsWith("openai-codex/")
				? "Codex"
				: "OpenRouter";
}

export function agentModelLabel(model: OpencodeModel): string {
	return `${agentModelProvider(model)} · ${model.name} · Effort: default`;
}

export function filterModels(
	models: readonly OpencodeModel[],
	query: string,
): OpencodeModel[] {
	const search = query.trim().toLowerCase();
	return models.filter(
		(model) =>
			model.name.toLowerCase().includes(search) ||
			model.id.toLowerCase().includes(search),
	);
}

export function selectedVisibleModelId(
	selectedId: string,
	visibleModels: readonly OpencodeModel[],
): string {
	if (selectedId === "") {
		return (
			visibleModels.find((model) => model.beginnerDefault === true)?.id ?? ""
		);
	}
	return visibleModels.some((model) => model.id === selectedId)
		? selectedId
		: "";
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.length > 0;
}
