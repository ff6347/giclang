// ABOUTME: Verifies persisted tutor model choices and catalog-derived visibility.
// ABOUTME: Covers conservative defaults, unavailable models, and refresh behavior.

import assert from "node:assert/strict";
import test from "node:test";
import type { ApplicationSettings } from "../lib/application-settings.ts";
import type { OpencodeModel } from "../lib/desktop-host.ts";
import {
	agentModelLabel,
	deriveVisibleModels,
	filterModels,
	loadEnabledModelIds,
	loadSelectedModelId,
	saveEnabledModelIds,
	saveSelectedModelId,
	selectedVisibleModelId,
} from "../lib/model-preferences.ts";

class MemorySettings implements ApplicationSettings {
	readonly values = new Map<string, string>();

	getItem(key: string): string | null {
		return this.values.get(key) ?? null;
	}

	setItem(key: string, value: string): void {
		this.values.set(key, value);
	}
}

const zenModel: OpencodeModel = {
	id: "opencode-zen/big-pickle",
	name: "Big Pickle",
};
const verifiedZenModel: OpencodeModel = {
	id: "opencode-zen/gpt-6-luna",
	name: "GPT-6 Luna",
	referenceToolsVerified: true,
};
const goModel: OpencodeModel = {
	id: "opencode-go/kimi-k3",
	name: "Kimi K3",
	referenceToolsVerified: true,
};
const openRouterFreeModel: OpencodeModel = {
	id: "openrouter/provider/free-model",
	name: "Free Model",
	pricing: "0",
};
const openRouterPaidModel: OpencodeModel = {
	id: "openrouter/provider/paid-model",
	name: "Paid Model",
	pricing: "0.01",
	referenceToolsVerified: true,
};
const codexModel: OpencodeModel = {
	id: "openai-codex/gpt-5.6-luna",
	name: "GPT-5.6 Luna",
	referenceToolsVerified: true,
	beginnerDefault: true,
};
const codexAdvancedModel: OpencodeModel = {
	id: "openai-codex/gpt-5.6-sol",
	name: "GPT-5.6 Sol",
	referenceToolsVerified: true,
};
const unknownProviderModel: OpencodeModel = {
	id: "other/provider/model",
	name: "Other",
	referenceToolsVerified: true,
};

test("enabled provider models enter the picker without reference verification", () => {
	assert.deepEqual(
		deriveVisibleModels(
			[zenModel, verifiedZenModel],
			[zenModel.id, verifiedZenModel.id],
		),
		[zenModel, verifiedZenModel],
	);
	assert.deepEqual(loadEnabledModelIds(new MemorySettings()), []);
});

test("the selected Agent model names its provider and marks unverified choices", () => {
	assert.equal(
		agentModelLabel(zenModel),
		"OpenCode Zen · Big Pickle · Not verified",
	);
	assert.equal(agentModelLabel(verifiedZenModel), "OpenCode Zen · GPT-6 Luna");
	assert.equal(agentModelLabel(goModel), "OpenCode Go · Kimi K3");
	assert.equal(
		agentModelLabel(openRouterFreeModel),
		"OpenRouter · Free Model · Not verified",
	);
	assert.equal(agentModelLabel(codexModel), "Codex · GPT-5.6 Luna");
});

test("fresh settings do not preselect an unverified or paid model", () => {
	const settings = new MemorySettings();
	assert.deepEqual(loadEnabledModelIds(settings), []);
	assert.equal(loadSelectedModelId(settings), "");
	assert.equal(settings.values.size, 0);
});

test("an explicit selection survives a settings reload only when eligible", () => {
	const settings = new MemorySettings();
	saveEnabledModelIds(settings, [verifiedZenModel.id, openRouterPaidModel.id]);
	saveSelectedModelId(settings, openRouterPaidModel.id);

	const reloaded = new MemorySettings();
	for (const [key, value] of settings.values) reloaded.setItem(key, value);
	const selected = loadSelectedModelId(reloaded);
	assert.equal(selected, openRouterPaidModel.id);
	assert.equal(
		selectedVisibleModelId(
			selected,
			deriveVisibleModels(
				[verifiedZenModel, openRouterPaidModel],
				loadEnabledModelIds(reloaded),
			),
		),
		openRouterPaidModel.id,
	);
	assert.equal(
		selectedVisibleModelId(
			selected,
			deriveVisibleModels([verifiedZenModel], loadEnabledModelIds(reloaded)),
		),
		"",
	);
	assert.equal(loadSelectedModelId(reloaded), openRouterPaidModel.id);
});

test("clearing a selected model persists an empty choice", () => {
	const settings = new MemorySettings();
	saveSelectedModelId(settings, verifiedZenModel.id);
	saveSelectedModelId(settings, "");
	assert.equal(loadSelectedModelId(settings), "");
});

test("disabling the selected model clears its saved choice", () => {
	const settings = new MemorySettings();
	saveEnabledModelIds(settings, [verifiedZenModel.id, openRouterPaidModel.id]);
	saveSelectedModelId(settings, openRouterPaidModel.id);
	saveEnabledModelIds(settings, [verifiedZenModel.id]);

	assert.equal(loadSelectedModelId(settings), "");
	assert.deepEqual(loadEnabledModelIds(settings), [verifiedZenModel.id]);
});

test("OpenRouter catalog models are not enabled by default, including free models", () => {
	const settings = new MemorySettings();
	assert.deepEqual(loadEnabledModelIds(settings), []);
	assert.deepEqual(
		deriveVisibleModels([openRouterPaidModel], loadEnabledModelIds(settings)),
		[],
	);
});

test("Codex shows only the beginner model by default and respects explicit choices", () => {
	const settings = new MemorySettings();
	const catalog = [codexModel, codexAdvancedModel, verifiedZenModel];
	const enabled = loadEnabledModelIds(settings, catalog);
	assert.deepEqual(deriveVisibleModels(catalog, enabled), [codexModel]);
	assert.equal(
		selectedVisibleModelId("", deriveVisibleModels(catalog, enabled)),
		codexModel.id,
	);

	saveEnabledModelIds(settings, []);
	assert.deepEqual(loadEnabledModelIds(settings), []);
	assert.deepEqual(
		deriveVisibleModels(catalog, loadEnabledModelIds(settings)),
		[],
	);

	saveEnabledModelIds(settings, [codexAdvancedModel.id]);
	assert.deepEqual(
		deriveVisibleModels(catalog, loadEnabledModelIds(settings)),
		[codexAdvancedModel],
	);
});

test("explicit choices persist across provider catalogs and refreshes", () => {
	const settings = new MemorySettings();
	saveEnabledModelIds(settings, [verifiedZenModel.id, openRouterPaidModel.id]);
	assert.deepEqual(loadEnabledModelIds(settings), [
		verifiedZenModel.id,
		openRouterPaidModel.id,
	]);
	assert.deepEqual(
		deriveVisibleModels(
			[verifiedZenModel, openRouterFreeModel, openRouterPaidModel],
			loadEnabledModelIds(settings),
		),
		[verifiedZenModel, openRouterPaidModel],
	);
});

test("unavailable selections are retained but never appear in the picker", () => {
	const settings = new MemorySettings();
	saveEnabledModelIds(settings, [verifiedZenModel.id, openRouterPaidModel.id]);
	assert.deepEqual(loadEnabledModelIds(settings), [
		verifiedZenModel.id,
		openRouterPaidModel.id,
	]);
	assert.deepEqual(
		deriveVisibleModels(
			[verifiedZenModel],
			[verifiedZenModel.id, openRouterPaidModel.id],
		),
		[verifiedZenModel],
	);
});

test("visible models require an enabled ID from a supported provider", () => {
	assert.deepEqual(
		deriveVisibleModels(
			[
				zenModel,
				verifiedZenModel,
				goModel,
				openRouterFreeModel,
				openRouterPaidModel,
				unknownProviderModel,
			],
			[
				zenModel.id,
				verifiedZenModel.id,
				goModel.id,
				openRouterFreeModel.id,
				openRouterPaidModel.id,
				unknownProviderModel.id,
				"openrouter/provider/missing",
			],
		),
		[
			zenModel,
			verifiedZenModel,
			goModel,
			openRouterFreeModel,
			openRouterPaidModel,
		],
	);
});

test("advanced model search matches names and IDs without changing enabled choices", () => {
	const catalog = [zenModel, openRouterFreeModel, openRouterPaidModel];
	assert.deepEqual(filterModels(catalog, "  PAID  "), [openRouterPaidModel]);
	assert.deepEqual(filterModels(catalog, "PROVIDER/free-model"), [
		openRouterFreeModel,
	]);
	assert.deepEqual(filterModels(catalog, ""), catalog);
	assert.deepEqual(filterModels(catalog, "missing"), []);
});

test("disabling or losing a selected model requires a fresh explicit choice", () => {
	const catalog = [verifiedZenModel, openRouterPaidModel];
	assert.equal(
		selectedVisibleModelId(verifiedZenModel.id, catalog),
		verifiedZenModel.id,
	);
	assert.equal(
		selectedVisibleModelId(openRouterPaidModel.id, [verifiedZenModel]),
		"",
	);
	assert.equal(selectedVisibleModelId("", catalog), "");
});

test("malformed saved preferences do not erase or rewrite stored choices", () => {
	const settings = new MemorySettings();
	settings.values.set("gic.tutor.enabled-model-ids", "{invalid");
	assert.deepEqual(loadEnabledModelIds(settings), []);
	assert.equal(settings.getItem("gic.tutor.enabled-model-ids"), "{invalid");
});

test("saving choices removes duplicates and ignores non-string values", () => {
	const settings = new MemorySettings();
	saveEnabledModelIds(settings, [
		zenModel.id,
		zenModel.id,
		2 as unknown as string,
	]);
	assert.deepEqual(
		JSON.parse(settings.getItem("gic.tutor.enabled-model-ids") ?? ""),
		[zenModel.id],
	);
});
