// ABOUTME: Loads and saves enabled tutor model IDs and derives picker visibility.
// ABOUTME: Keeps explicit selections independent of transient provider catalogs.

import type { ApplicationSettings } from "./application-settings.ts";
import type { OpencodeModel } from "./desktop-host.ts";

const ENABLED_MODEL_IDS_KEY = "gic.tutor.enabled-model-ids";
const DEFAULT_ZEN_MODEL_ID = "opencode-zen/big-pickle";

export function loadEnabledModelIds(
	settings: ApplicationSettings,
	catalog: readonly OpencodeModel[],
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

	return catalog.some((model) => model.id === DEFAULT_ZEN_MODEL_ID)
		? [DEFAULT_ZEN_MODEL_ID]
		: [];
}

export function saveEnabledModelIds(
	settings: ApplicationSettings,
	enabledModelIds: readonly string[],
): void {
	settings.setItem(
		ENABLED_MODEL_IDS_KEY,
		JSON.stringify([...new Set(enabledModelIds.filter(isNonEmptyString))]),
	);
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
				model.id.startsWith("openrouter/")),
	);
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
	return visibleModels.some((model) => model.id === selectedId)
		? selectedId
		: "";
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.length > 0;
}
