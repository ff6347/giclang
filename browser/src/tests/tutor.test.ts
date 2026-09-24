// ABOUTME: Verifies deterministic tutor context, streaming, and session serialization.
// ABOUTME: Pins the provider boundary without introducing a browser or provider dependency.

import assert from "node:assert/strict";
import test from "node:test";
import {
	buildTutorContext,
	createDeterministicTutor,
	parseTutorSession,
	serializeTutorSession,
} from "../lib/tutor.ts";

test("tutor context contains current sketch state without drawing commands", () => {
	const context = buildTutorContext(
		"rect(1, 2, 3, 4);",
		["bad call"],
		["Line 1: hello"],
		null,
	);

	assert.deepEqual(context, {
		source: "rect(1, 2, 3, 4);",
		diagnostics: ["bad call"],
		runtimeError: null,
		output: ["Line 1: hello"],
	});
	assert.equal("commands" in context, false);
});

test("deterministic tutor streams a Socratic response and honors cancellation", async () => {
	const provider = createDeterministicTutor();
	const controller = new AbortController();
	let response = "";
	for await (const chunk of provider.stream(
		{
			question: "How do I debug this?",
			context: buildTutorContext("rect(1);", [], []),
		},
		controller.signal,
	)) {
		response += chunk;
	}
	assert.match(response, /smallest change/);

	controller.abort();
	let cancelled = "";
	for await (const chunk of provider.stream(
		{ question: "Again", context: buildTutorContext("rect(1);", [], []) },
		controller.signal,
	)) {
		cancelled += chunk;
	}
	assert.equal(cancelled, "");
});

test("session records round-trip through JSONL and ignore a partial final line", () => {
	const records = [
		{
			type: "session" as const,
			id: "s1",
			name: "Sketch help",
			startedAt: "2026-09-24T10:00:00Z",
			sketchId: "sketch-a",
		},
		{
			type: "message" as const,
			sessionId: "s1",
			role: "student" as const,
			text: "Why?",
			at: "2026-09-24T10:00:01Z",
		},
	];
	const serialized = `${serializeTutorSession(records)}{"type":"message"`;

	assert.deepEqual(parseTutorSession(serialized), records);
});
