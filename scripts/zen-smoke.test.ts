// ABOUTME: Verifies safe text-length extraction from representative Zen SSE events.
// ABOUTME: Uses synthetic fixtures and never contacts the provider API.

import assert from "node:assert/strict";
import test from "node:test";
import { probeSucceeded, summarizeSse } from "./zen-smoke.ts";

test("reports text and actual terminal events for each Zen stream", () => {
	assert.deepEqual(
		summarizeSse(
			'data: {"choices":[{"delta":{"content":"OK"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
			"chat-completions",
		),
		{ textLength: 2, completed: true, errorEvent: false },
	);
	assert.deepEqual(
		summarizeSse(
			'data: {"type":"response.output_text.delta","delta":"OK"}\n\ndata: {"type":"response.completed"}\n\n',
			"responses",
		),
		{ textLength: 2, completed: true, errorEvent: false },
	);
	assert.deepEqual(
		summarizeSse(
			'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"OK"}}\n\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\ndata: {"type":"message_stop"}\n\n',
			"messages",
		),
		{ textLength: 2, completed: true, errorEvent: false },
	);
	assert.deepEqual(
		summarizeSse(
			'data: {"candidates":[{"content":{"parts":[{"text":"OK"}]},"finishReason":"STOP"}]}\n\n',
			"generateContent",
		),
		{ textLength: 2, completed: true, errorEvent: false },
	);
});

test("a successful HTTP stream without a valid terminal is not a completion", () => {
	assert.deepEqual(
		summarizeSse(
			'data: {"type":"response.output_text.delta","delta":"O"}\n\ndata: {"type":"response.failed"}\n\n',
			"responses",
		),
		{ textLength: 1, completed: false, errorEvent: true },
	);
	assert.deepEqual(
		summarizeSse(
			'data: {"candidates":[{"finishReason":"MAX_TOKENS"}]}\n\n',
			"generateContent",
		),
		{ textLength: 0, completed: false, errorEvent: false },
	);
	assert.deepEqual(
		summarizeSse('data: {"type":"response.completed"}\n\n', "responses"),
		{
			textLength: 0,
			completed: false,
			errorEvent: false,
		},
	);
	assert.deepEqual(
		summarizeSse(
			'data: {"choices":[{"delta":{"content":"partial"},"finish_reason":"length"}]}\n\ndata: [DONE]\n\n',
			"chat-completions",
		),
		{ textLength: 7, completed: false, errorEvent: false },
	);
	assert.deepEqual(
		summarizeSse(
			'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"partial"}}\n\ndata: {"type":"message_delta","delta":{"stop_reason":"max_tokens"}}\n\ndata: {"type":"message_stop"}\n\n',
			"messages",
		),
		{ textLength: 7, completed: false, errorEvent: false },
	);
	assert.deepEqual(
		summarizeSse(
			'data: {"choices":[{"delta":{"content":"partial"},"finish_reason":null}]}\n\ndata: [DONE]\n\n',
			"chat-completions",
		),
		{ textLength: 7, completed: false, errorEvent: false },
	);
});

test("a smoke probe succeeds only with text and a valid terminal", () => {
	assert.equal(
		probeSucceeded(200, { textLength: 2, completed: true, errorEvent: false }),
		true,
	);
	for (const [status, result] of [
		[400, { textLength: 0, completed: false, errorEvent: false }],
		[200, { textLength: 2, completed: false, errorEvent: false }],
		[200, { textLength: 2, completed: true, errorEvent: true }],
		[null, { textLength: 0, completed: false, errorEvent: false }],
	] as const) {
		assert.equal(probeSucceeded(status, result), false);
	}
});
