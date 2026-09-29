// ABOUTME: Verifies Agent tab availability across browser and desktop workspaces.
// ABOUTME: Exercises persisted layouts with real FlexLayout models and settings storage.

import assert from "node:assert/strict";
import { test } from "node:test";
import { TabNode } from "flexlayout-react";
import {
	AGENT_ID,
	createDefaultWorkspace,
	loadWorkspace,
	saveWorkspace,
} from "../lib/workspace-model.ts";

const values = new Map<string, string>();
const settings = {
	getItem: (key: string) => values.get(key) ?? null,
	setItem: (key: string, value: string) => {
		values.set(key, value);
	},
};

test("desktop retains Agent after loading a browser workspace", () => {
	const desktop = createDefaultWorkspace(true);
	assert.ok(desktop.getNodeById(AGENT_ID) instanceof TabNode);
	saveWorkspace(desktop, settings);

	const browser = loadWorkspace(false, settings);
	assert.equal(browser.getNodeById(AGENT_ID), undefined);

	const restoredDesktop = loadWorkspace(true, settings);
	assert.ok(restoredDesktop.getNodeById(AGENT_ID) instanceof TabNode);
	assert.equal(
		restoredDesktop.getNodeById(AGENT_ID)?.getParent()?.getId(),
		"output-tabset",
	);
});
