// ABOUTME: Tests bounded reference-tool parsing and safe CLI argument handling.
// ABOUTME: Uses synthetic protocol events and never contacts a provider.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
	parseToolEvents,
	appendToolResults,
} from "./zen-reference-protocol.ts";
import { parseArguments, requestBody } from "./zen-reference-smoke.ts";
import { search, validCall } from "./zen-reference-content.ts";

test("chat probes require a reference tool with the native request shape", () => {
	const body = JSON.parse(
		requestBody("glm-5.3", [{ role: "user", content: "Question" }], true),
	);
	assert.equal(body.model, "glm-5.3");
	assert.equal(body.tool_choice, "required");
	assert.deepEqual(
		body.tools.map(
			(tool: { function: { name: string } }) => tool.function.name,
		),
		["search_reference", "read_reference"],
	);
});

test("parses both Claude tools from one complete streamed turn", () => {
	assert.deepEqual(
		parseToolEvents(
			[
				'data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"call-search","name":"search_reference","input":{}}}',
				'data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"query\\":\\"circle\\"}"}}',
				'data: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"call-read","name":"read_reference","input":{}}}',
				'data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\\"section\\":\\"Drawing\\"}"}}',
				'data: {"type":"message_delta","delta":{"stop_reason":"tool_use"}}',
				'data: {"type":"message_stop"}',
			].join("\n\n"),
			"claude-sonnet-5",
		).calls,
		[
			{
				id: "call-search",
				name: "search_reference",
				arguments: '{"query":"circle"}',
			},
			{
				id: "call-read",
				name: "read_reference",
				arguments: '{"section":"Drawing"}',
			},
		],
	);
});

test("serializes correlated concurrent tool calls and results per provider", () => {
	const calls = [
		{
			id: "call-search",
			name: "search_reference",
			arguments: '{"query":"circle"}',
		},
		{
			id: "call-read",
			name: "read_reference",
			arguments: '{"section":"Drawing"}',
		},
	];
	for (const model of [
		"big-pickle",
		"gpt-6-luna",
		"claude-sonnet-5",
	] as const) {
		const history = appendToolResults(model, [], calls, ["matches", "drawing"]);
		if (model === "big-pickle") {
			assert.equal(
				(history[0] as { tool_calls: unknown[] }).tool_calls.length,
				2,
			);
			assert.deepEqual(
				history
					.slice(1)
					.map((entry) => (entry as { tool_call_id: string }).tool_call_id),
				["call-search", "call-read"],
			);
		} else if (model === "gpt-6-luna") {
			assert.deepEqual(
				history.map((entry) => (entry as { type: string }).type),
				[
					"function_call",
					"function_call",
					"function_call_output",
					"function_call_output",
				],
			);
			assert.deepEqual(
				(history as { call_id: string }[]).map((entry) => entry.call_id),
				["call-search", "call-read", "call-search", "call-read"],
			);
		} else {
			assert.equal((history[0] as { content: unknown[] }).content.length, 2);
			assert.deepEqual(
				(history[1] as { content: { tool_use_id: string }[] }).content.map(
					(entry) => entry.tool_use_id,
				),
				["call-search", "call-read"],
			);
		}
	}
});

test("parses OpenAI chat tool calls without exposing unrelated response data", () => {
	assert.deepEqual(
		parseToolEvents(
			'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call-1","function":{"name":"search_reference","arguments":"{\\"query\\":\\"circle\\"}"}}]},"finish_reason":"tool_calls"}]}\n\ndata: [DONE]\n',
			"big-pickle",
		),
		{
			calls: [
				{
					id: "call-1",
					name: "search_reference",
					arguments: '{"query":"circle"}',
				},
			],
			textLength: 0,
			terminalReason: "tool_calls",
		},
	);
});

test("uses the Chat Completions tool protocol for documented Zen chat models", () => {
	assert.deepEqual(
		parseToolEvents(
			'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call-1","function":{"name":"search_reference","arguments":"{\\"query\\":\\"circle\\"}"}}]},"finish_reason":"tool_calls"}]}\n\ndata: [DONE]\n',
			"glm-5.3",
		).calls,
		[
			{
				id: "call-1",
				name: "search_reference",
				arguments: '{"query":"circle"}',
			},
		],
	);
	assert.deepEqual(
		appendToolResults(
			"deepseek-v4-pro",
			[],
			[
				{
					id: "call-1",
					name: "search_reference",
					arguments: '{"query":"circle"}',
				},
			],
			["matches"],
		).map((entry) => (entry as { role: string }).role),
		["assistant", "tool"],
	);
});

test("joins streamed OpenAI argument fragments in order", () => {
	const parsed = parseToolEvents(
		'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call-1","function":{"name":"search_reference","arguments":"{\\"query\\":"}}]}}]}\n\ndata: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\"circle\\"}"}}]},"finish_reason":"tool_calls"}]}\n',
		"big-pickle",
	);
	assert.equal(parsed.calls[0]?.arguments, '{"query":"circle"}');
});

test("parses Responses function calls and Claude tool-use blocks", () => {
	assert.deepEqual(
		parseToolEvents(
			'data: {"type":"response.output_item.done","item":{"type":"function_call","call_id":"call-2","name":"read_reference","arguments":"{\\"section\\":\\"Drawing\\"}"}}\n\ndata: {"type":"response.completed"}\n',
			"gpt-6-luna",
		).calls,
		[
			{
				id: "call-2",
				name: "read_reference",
				arguments: '{"section":"Drawing"}',
			},
		],
	);
	assert.deepEqual(
		parseToolEvents(
			'data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"call-3","name":"search_reference","input":{}}}\n\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"query\\":\\"circle\\"}"}}\n\ndata: {"type":"message_delta","delta":{"stop_reason":"tool_use"}}\n\ndata: {"type":"message_stop"}\n',
			"claude-sonnet-5",
		).calls,
		[
			{
				id: "call-3",
				name: "search_reference",
				arguments: '{"query":"circle"}',
			},
		],
	);
});

test("validates useful reference queries without requiring exact model wording", () => {
	assert.equal(
		validCall(
			{
				id: "call-1",
				name: "search_reference",
				arguments: '{"query":"circle function signature"}',
			},
			"search_reference",
			"query",
		),
		true,
	);
	assert.equal(
		validCall(
			{
				id: "call-2",
				name: "read_reference",
				arguments: '{"section":"drawing"}',
			},
			"read_reference",
			"section",
		),
		true,
	);
	const reference = readFileSync(
		new URL(
			"../src-tauri/workspace/gic-tutor/references/language.md",
			import.meta.url,
		),
		"utf8",
	);
	assert.match(
		search(reference, "circle function signature"),
		/circle\(x, y, radius\)/,
	);
});

test("rejects arbitrary model selectors and malformed CLI input", () => {
	assert.deepEqual(parseArguments(["--model", "gpt-6-luna"]), {
		model: "gpt-6-luna",
		help: false,
		error: null,
	});
	for (const id of [
		"glm-5.3",
		"glm-5.3-flash",
		"kimi-k3",
		"kimi-k2.7-code",
		"mimo-v2.6-flash-free",
		"deepseek-v4.1-flash",
		"deepseek-v4-pro",
		"deepseek-v4-flash",
		"space-bunny-free",
	]) {
		assert.deepEqual(parseArguments(["--model", id]), {
			model: id,
			help: false,
			error: null,
		});
	}
	for (const argv of [
		["--model", "unlisted-model"],
		["--model", "mimo-v2.6-pro"],
		["--model"],
		["unexpected"],
	]) {
		assert.equal(parseArguments(argv).error, "invalid arguments");
	}
	assert.equal(parseArguments(["--help"]).help, true);
});

test("--help exits without requiring a key or contacting the provider", () => {
	const result = spawnSync(
		process.execPath,
		[
			fileURLToPath(new URL("./zen-reference-smoke.ts", import.meta.url)),
			"--help",
		],
		{
			encoding: "utf8",
			timeout: 5_000,
			env: { ...process.env, OPENCODE_API_KEY: "" },
		},
	);
	assert.equal(result.status, 0);
	assert.match(result.stdout, /Usage:/);
	assert.doesNotMatch(
		result.stdout + result.stderr,
		/Missing OPENCODE_API_KEY/,
	);
});
