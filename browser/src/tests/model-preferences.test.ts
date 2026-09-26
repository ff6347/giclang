// ABOUTME: Verifies persisted tutor model choices and catalog-derived visibility.
// ABOUTME: Covers conservative defaults, unavailable models, and refresh behavior.

import assert from "node:assert/strict";
import test from "node:test";
import type { ApplicationSettings } from "../lib/application-settings.ts";
import type { OpencodeModel } from "../lib/desktop-host.ts";
import {
	deriveVisibleModels,
	filterModels,
	loadEnabledModelIds,
	saveEnabledModelIds,
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
const unknownProviderModel: OpencodeModel = {
	id: "other/provider/model",
	name: "Other",
	referenceToolsVerified: true,
};

test("only models with proven reference tools enter the searchable picker", () => {
	assert.deepEqual(
		deriveVisibleModels(
			[zenModel, verifiedZenModel],
			[zenModel.id, verifiedZenModel.id],
		),
		[verifiedZenModel],
	);
	assert.deepEqual(loadEnabledModelIds(new MemorySettings()), []);
});

test("fresh settings do not preselect an unverified or paid model", () => {
	const settings = new MemorySettings();
	assert.deepEqual(loadEnabledModelIds(settings), []);
	assert.equal(settings.values.size, 0);
});

test("OpenRouter catalog models are not enabled by default, including free models", () => {
	const settings = new MemorySettings();
	assert.deepEqual(loadEnabledModelIds(settings), []);
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
				openRouterFreeModel,
				openRouterPaidModel,
				unknownProviderModel,
			],
			[
				zenModel.id,
				verifiedZenModel.id,
				openRouterPaidModel.id,
				unknownProviderModel.id,
				"openrouter/provider/missing",
			],
		),
		[verifiedZenModel, openRouterPaidModel],
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
