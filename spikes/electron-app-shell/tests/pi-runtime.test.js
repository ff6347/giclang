import assert from "node:assert/strict";
import test from "node:test";
import { PiRuntime } from "../pi-runtime.js";

test("runs pi-agent-core with a deterministic streaming provider", async () => {
	const chunks = [];
	const runtime = new PiRuntime();
	const result = await runtime.probe({
		onChunk: (chunk) => chunks.push(chunk),
	});

	assert.equal(result.aborted, false);
	assert.equal(
		result.text,
		"What part of the sketch would you like to examine first?",
	);
	assert.equal(chunks.length > 1, true);
});

test("cancels an active deterministic Pi stream", async () => {
	const runtime = new PiRuntime();
	const response = runtime.probe({ mode: "cancel" });
	await new Promise((resolve) => setTimeout(resolve, 50));

	assert.equal(runtime.cancel(), true);
	const result = await response;
	assert.equal(result.aborted, true);
	assert.notEqual(
		result.text,
		"This deliberately long deterministic response must be cancelled before it completes.",
	);
});
