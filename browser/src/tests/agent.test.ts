// ABOUTME: Verifies deterministic agent context, streaming, and session serialization.
// ABOUTME: Pins the provider boundary without introducing a browser or provider dependency.

import assert from "node:assert/strict";
import test from "node:test";
import {
	buildAgentContext,
	createDesktopAgent,
	createDeterministicAgent,
	parseAgentSession,
	serializeAgentSession,
} from "../lib/agent.ts";

test("agent context contains current sketch state without drawing commands", () => {
	const context = buildAgentContext(
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

test("deterministic agent streams a Socratic response and honors cancellation", async () => {
	const provider = createDeterministicAgent();
	const controller = new AbortController();
	let response = "";
	for await (const chunk of provider.stream(
		{
			question: "How do I debug this?",
			context: buildAgentContext("rect(1);", [], []),
		},
		controller.signal,
	)) {
		response += chunk;
	}
	assert.match(response, /smallest change/);
	assert.match(response, /```gic\nrect\(10, 10, 20, 20\);\n```/);

	controller.abort();
	let cancelled = "";
	for await (const chunk of provider.stream(
		{ question: "Again", context: buildAgentContext("rect(1);", [], []) },
		controller.signal,
	)) {
		cancelled += chunk;
	}
	assert.equal(cancelled, "");
});

test("desktop provider forwards ordered native events and cancellation", async () => {
	let emit:
		| ((event: import("../lib/desktop-host.ts").OpencodeAgentEvent) => void)
		| undefined;
	let cancelled = false;
	const desktop = {
		async onOpencodeAgentEvent(
			handler: (
				event: import("../lib/desktop-host.ts").OpencodeAgentEvent,
			) => void,
		) {
			emit = handler;
			return () => undefined;
		},
		async sendOpencodeRequest() {
			emit?.({ kind: "text", text: "first " });
			emit?.({ kind: "text", text: "second" });
			emit?.({ kind: "complete" });
		},
		async cancelOpencodeRequest() {
			cancelled = true;
		},
	} as never;
	const provider = createDesktopAgent(desktop, { model: "gpt-5.5" });
	let response = "";
	for await (const chunk of provider.stream(
		{ question: "Why?", context: buildAgentContext("rect(1);", [], []) },
		new AbortController().signal,
	))
		response += chunk;
	assert.equal(response, "first second");
	assert.equal(cancelled, false);
});

test("desktop provider cancellation invokes native cancellation", async () => {
	let emit:
		| ((event: import("../lib/desktop-host.ts").OpencodeAgentEvent) => void)
		| undefined;
	let cancelled = false;
	let unlistened = false;
	const desktop = {
		async onOpencodeAgentEvent(
			handler: (
				event: import("../lib/desktop-host.ts").OpencodeAgentEvent,
			) => void,
		) {
			emit = handler;
			return () => {
				unlistened = true;
			};
		},
		async sendOpencodeRequest() {
			emit?.({ kind: "text", text: "partial" });
		},
		async cancelOpencodeRequest() {
			cancelled = true;
		},
	} as never;
	const controller = new AbortController();
	const provider = createDesktopAgent(desktop, { model: "gpt-5.5" });
	const stream = provider.stream(
		{ question: "Why?", context: buildAgentContext("rect(1);", [], []) },
		controller.signal,
	);
	const iterator = stream[Symbol.asyncIterator]();
	await iterator.next();
	controller.abort();
	await iterator.return?.();
	assert.equal(cancelled, true);
	assert.equal(unlistened, true);
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
	const serialized = `${serializeAgentSession(records)}{"type":"message"`;

	assert.deepEqual(parseAgentSession(serialized), records);
});
