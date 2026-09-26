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
const openRouterFreeModel: OpencodeModel = {
	id: "openrouter/provider/free-model",
	name: "Free Model",
	pricing: "0",
};
const openRouterPaidModel: OpencodeModel = {
	id: "openrouter/provider/paid-model",
	name: "Paid Model",
	pricing: "0.01",
};
const unknownProviderModel: OpencodeModel = {
	id: "other/provider/model",
	name: "Other",
};

test("defaults only to the handpicked Zen model when it exists", () => {
	const settings = new MemorySettings();
	assert.deepEqual(
		loadEnabledModelIds(settings, [zenModel, openRouterFreeModel]),
		[zenModel.id],
	);
	assert.deepEqual(loadEnabledModelIds(settings, [openRouterFreeModel]), []);
});

test("OpenRouter catalog models are not enabled by default, including free models", () => {
	const settings = new MemorySettings();
	assert.deepEqual(
		loadEnabledModelIds(settings, [openRouterFreeModel, openRouterPaidModel]),
		[],
	);
});

test("explicit choices persist across provider catalogs and refreshes", () => {
	const settings = new MemorySettings();
	saveEnabledModelIds(settings, [zenModel.id, openRouterPaidModel.id]);
	assert.deepEqual(loadEnabledModelIds(settings, [openRouterPaidModel]), [
		zenModel.id,
		openRouterPaidModel.id,
	]);
	assert.deepEqual(
		deriveVisibleModels(
			[zenModel, openRouterFreeModel, openRouterPaidModel],
			loadEnabledModelIds(settings, [zenModel]),
		),
		[zenModel, openRouterPaidModel],
	);
});

test("unavailable selections are retained but never appear in the picker", () => {
	const settings = new MemorySettings();
	saveEnabledModelIds(settings, [zenModel.id, openRouterPaidModel.id]);
	assert.deepEqual(loadEnabledModelIds(settings, [zenModel]), [
		zenModel.id,
		openRouterPaidModel.id,
	]);
	assert.deepEqual(
		deriveVisibleModels([zenModel], [zenModel.id, openRouterPaidModel.id]),
		[zenModel],
	);
});

test("visible models require an enabled ID from a supported provider", () => {
	assert.deepEqual(
		deriveVisibleModels(
			[
				zenModel,
				openRouterFreeModel,
				openRouterPaidModel,
				unknownProviderModel,
			],
			[
				zenModel.id,
				openRouterPaidModel.id,
				unknownProviderModel.id,
				"openrouter/provider/missing",
			],
		),
		[zenModel, openRouterPaidModel],
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
	const catalog = [zenModel, openRouterPaidModel];
	assert.equal(selectedVisibleModelId(zenModel.id, catalog), zenModel.id);
	assert.equal(selectedVisibleModelId(openRouterPaidModel.id, [zenModel]), "");
	assert.equal(selectedVisibleModelId("", catalog), "");
});

test("malformed saved preferences do not erase or rewrite stored choices", () => {
	const settings = new MemorySettings();
	settings.values.set("gic.tutor.enabled-model-ids", "{invalid");
	assert.deepEqual(loadEnabledModelIds(settings, [zenModel]), []);
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
