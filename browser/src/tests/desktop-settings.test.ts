// ABOUTME: Verifies desktop settings finish queued native writes before shutdown.
// ABOUTME: Covers rapid settings changes without requiring a packaged webview.

import assert from "node:assert/strict";
import test from "node:test";
import { DesktopSettings } from "../lib/desktop-settings.ts";

test("flush waits for every queued settings write", async () => {
	const firstWrite = Promise.withResolvers<void>();
	const writes: [string, string][] = [];
	const settings = new DesktopSettings({}, async (key, value) => {
		writes.push([key, value]);
		if (writes.length === 1) await firstWrite.promise;
	});

	settings.setItem("gic.canvasFrame", "false");
	settings.setItem("gic.formatOnSave", "false");
	await Promise.resolve();

	let flushed = false;
	const flush = settings.flush().then(() => {
		flushed = true;
	});
	await Promise.resolve();

	assert.equal(flushed, false);
	assert.deepEqual(writes, [["gic.canvasFrame", "false"]]);

	firstWrite.resolve();
	await flush;

	assert.deepEqual(writes, [
		["gic.canvasFrame", "false"],
		["gic.formatOnSave", "false"],
	]);
});

test("flush rejects when a failed native write cannot be retried", async () => {
	const settings = new DesktopSettings({}, async () => {
		throw new Error("disk unavailable");
	});
	settings.setItem("gic.workspaceLayout", "layout");

	await assert.rejects(settings.flush(), /Unable to save desktop settings/);
});

test("flush retries the current settings after a native write fails", async () => {
	let attempts = 0;
	const settings = new DesktopSettings({}, async () => {
		attempts += 1;
		if (attempts === 1) throw new Error("temporary failure");
	});
	settings.setItem("gic.workspaceLayout", "layout");

	await settings.flush();

	assert.equal(attempts, 2);
});
