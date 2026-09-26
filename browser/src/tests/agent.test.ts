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
	let requestId = "";
	const desktop = {
		async onOpencodeAgentEvent(
			handler: (
				event: import("../lib/desktop-host.ts").OpencodeAgentEvent,
			) => void,
		) {
			emit = handler;
			return () => undefined;
		},
		async sendOpencodeRequest(request: { requestId: string }) {
			requestId = request.requestId;
			emit?.({ requestId, kind: "text", text: "first " });
			emit?.({ requestId, kind: "text", text: "second" });
			emit?.({ requestId, kind: "complete" });
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

test("desktop provider yields text before the native request completes", async () => {
	let emit:
		| ((event: import("../lib/desktop-host.ts").OpencodeAgentEvent) => void)
		| undefined;
	let finishRequest!: () => void;
	let requestId = "";
	const desktop = {
		async onOpencodeAgentEvent(handler: typeof emit) {
			emit = handler;
			return () => undefined;
		},
		sendOpencodeRequest(request: { requestId: string }) {
			requestId = request.requestId;
			return new Promise<void>((resolve) => {
				finishRequest = resolve;
				setTimeout(() => emit?.({ requestId, kind: "text", text: "early" }), 0);
			});
		},
		async cancelOpencodeRequest() {},
	} as never;
	const provider = createDesktopAgent(desktop, { model: "big-pickle" });
	const iterator = provider
		.stream(
			{ question: "Why?", context: buildAgentContext("rect(1);", [], []) },
			new AbortController().signal,
		)
		[Symbol.asyncIterator]();
	assert.deepEqual(await iterator.next(), { value: "early", done: false });
	finishRequest();
	emit?.({ requestId, kind: "complete" });
	assert.deepEqual(await iterator.next(), { value: undefined, done: true });
});

test("desktop provider waits for its own terminal event after invoke resolves", async () => {
	let emit:
		| ((event: import("../lib/desktop-host.ts").OpencodeAgentEvent) => void)
		| undefined;
	const desktop = {
		async onOpencodeAgentEvent(
			handler: (
				event: import("../lib/desktop-host.ts").OpencodeAgentEvent,
			) => void,
		) {
			emit = handler;
			return () => undefined;
		},
		async sendOpencodeRequest(request: { requestId: string }) {
			setTimeout(() => {
				emit?.({ requestId: "previous", kind: "cancelled" });
				emit?.({ requestId: request.requestId, kind: "text", text: "answer" });
				emit?.({ requestId: request.requestId, kind: "complete" });
			}, 0);
		},
		async cancelOpencodeRequest() {},
	} as never;
	let answer = "";
	for await (const text of createDesktopAgent(desktop, {
		model: "big-pickle",
	}).stream(
		{ question: "Why?", context: buildAgentContext("rect(1);", [], []) },
		new AbortController().signal,
	)) {
		answer += text;
	}
	assert.equal(answer, "answer");
});

test("desktop provider ignores late events from an aborted request on retry", async () => {
	const listeners: ((
		event: import("../lib/desktop-host.ts").OpencodeAgentEvent,
	) => void)[] = [];
	const requestIds: string[] = [];
	const desktop = {
		async onOpencodeAgentEvent(
			handler: (
				event: import("../lib/desktop-host.ts").OpencodeAgentEvent,
			) => void,
		) {
			listeners.push(handler);
			return () => undefined;
		},
		async sendOpencodeRequest(request: { requestId: string }) {
			requestIds.push(request.requestId);
		},
		async cancelOpencodeRequest() {},
	} as never;
	const provider = createDesktopAgent(desktop, { model: "big-pickle" });
	const firstController = new AbortController();
	const first = provider
		.stream(
			{ question: "first", context: buildAgentContext("rect(1);", [], []) },
			firstController.signal,
		)
		[Symbol.asyncIterator]();
	const firstPending = first.next();
	await new Promise((resolve) => setTimeout(resolve, 0));
	firstController.abort();
	await firstPending;

	const second = provider
		.stream(
			{ question: "retry", context: buildAgentContext("rect(1);", [], []) },
			new AbortController().signal,
		)
		[Symbol.asyncIterator]();
	const secondPending = second.next();
	await new Promise((resolve) => setTimeout(resolve, 0));
	assert.equal(requestIds.length, 2);
	listeners[1]?.({ requestId: requestIds[0]!, kind: "text", text: "stale" });
	listeners[1]?.({ requestId: requestIds[1]!, kind: "text", text: "current" });
	listeners[1]?.({ requestId: requestIds[1]!, kind: "complete" });
	assert.deepEqual(await secondPending, { value: "current", done: false });
	assert.deepEqual(await second.next(), { value: undefined, done: true });
});

test("desktop provider reports an error event and rejected invoke only once", async () => {
	let emit:
		| ((event: import("../lib/desktop-host.ts").OpencodeAgentEvent) => void)
		| undefined;
	const desktop = {
		async onOpencodeAgentEvent(handler: typeof emit) {
			emit = handler;
			return () => undefined;
		},
		async sendOpencodeRequest(request: { requestId: string }) {
			const error = "OpenCode request failed (HTTP 401): reconnect.";
			emit?.({ requestId: request.requestId, kind: "error", message: error });
			throw new Error(error);
		},
		async cancelOpencodeRequest() {},
	} as never;
	const iterator = createDesktopAgent(desktop, { model: "big-pickle" })
		.stream(
			{ question: "Why?", context: buildAgentContext("rect(1);", [], []) },
			new AbortController().signal,
		)
		[Symbol.asyncIterator]();
	await assert.rejects(iterator.next(), /HTTP 401/);
	assert.deepEqual(await iterator.next(), { value: undefined, done: true });
});

test("desktop provider cancellation invokes native cancellation", async () => {
	let emit:
		| ((event: import("../lib/desktop-host.ts").OpencodeAgentEvent) => void)
		| undefined;
	let cancelledRequestId: string | null = null;
	let unlistened = false;
	let requestId = "";
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
		async sendOpencodeRequest(request: { requestId: string }) {
			requestId = request.requestId;
			emit?.({ requestId, kind: "text", text: "partial" });
		},
		async cancelOpencodeRequest(id: string) {
			cancelledRequestId = id;
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
	assert.equal(cancelledRequestId, requestId);
	assert.equal(unlistened, true);
});

test("desktop provider abort wakes a stalled event stream", async () => {
	let cancelled = false;
	const desktop = {
		async onOpencodeAgentEvent() {
			return () => undefined;
		},
		async sendOpencodeRequest() {
			await new Promise<void>(() => {});
		},
		async cancelOpencodeRequest() {
			cancelled = true;
		},
	} as never;
	const controller = new AbortController();
	const iterator = createDesktopAgent(desktop, { model: "big-pickle" })
		.stream(
			{ question: "Why?", context: buildAgentContext("rect(1);", [], []) },
			controller.signal,
		)
		[Symbol.asyncIterator]();
	const result = iterator.next();
	await new Promise((resolve) => setTimeout(resolve, 0));
	controller.abort();
	assert.deepEqual(await result, { value: undefined, done: true });
	assert.equal(cancelled, true);
});

test("desktop provider never starts an already-aborted request", async () => {
	let listened = false;
	let sent = false;
	const desktop = {
		async onOpencodeAgentEvent() {
			listened = true;
			return () => undefined;
		},
		async sendOpencodeRequest() {
			sent = true;
		},
		async cancelOpencodeRequest() {},
	} as never;
	const controller = new AbortController();
	controller.abort();
	const stream = createDesktopAgent(desktop, {
		model: "opencode-zen/big-pickle",
	});
	for await (const _chunk of stream.stream(
		{ question: "Why?", context: buildAgentContext("rect(1);", [], []) },
		controller.signal,
	)) {
		assert.fail("An aborted request must not yield text.");
	}
	assert.equal(listened, false);
	assert.equal(sent, false);
});

test("desktop provider does not send after cancellation during listener setup", async () => {
	let finishListening!: () => void;
	let unlistened = false;
	let sent = false;
	const desktop = {
		onOpencodeAgentEvent() {
			return new Promise<() => void>((resolve) => {
				finishListening = () =>
					resolve(() => {
						unlistened = true;
					});
			});
		},
		async sendOpencodeRequest() {
			sent = true;
		},
		async cancelOpencodeRequest() {},
	} as never;
	const controller = new AbortController();
	const iterator = createDesktopAgent(desktop, {
		model: "opencode-zen/big-pickle",
	})
		.stream(
			{ question: "Why?", context: buildAgentContext("rect(1);", [], []) },
			controller.signal,
		)
		[Symbol.asyncIterator]();
	const pending = iterator.next();
	await new Promise((resolve) => setImmediate(resolve));
	controller.abort();
	finishListening();
	assert.deepEqual(await pending, { value: undefined, done: true });
	assert.equal(sent, false);
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
