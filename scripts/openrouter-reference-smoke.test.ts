// ABOUTME: Tests the OpenRouter reference-tool probe's model selection and wire flow.
// ABOUTME: Uses a local HTTP server and never contacts an external provider.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseArguments } from "./openrouter-reference-smoke.ts";
import { runModel } from "./reference-tool-probe.ts";

test("selects exact public OpenRouter models without substituting variants", () => {
	for (const model of [
		"z-ai/glm-5.3",
		"z-ai/glm-5.3-flash",
		"moonshotai/kimi-k3",
		"moonshotai/kimi-k2.7-code",
		"xiaomi/mimo-v2.6-flash",
		"xiaomi/mimo-v2.6-pro",
		"deepseek/deepseek-v4.1-flash",
		"deepseek/deepseek-v4-pro",
		"deepseek/deepseek-v4-flash",
	]) {
		assert.equal(parseArguments(["--model", model]).model, model);
	}
	for (const model of [
		"stealth/space-bunny-alpha",
		"deepseek/deepseek-v4-pro-0813",
		"z-ai/glm-5.3:batch",
		"missing/model",
	]) {
		assert.equal(parseArguments(["--model", model]).error, "invalid arguments");
	}
});

test("OpenRouter reference probe correlates search and read calls over HTTP", async () => {
	const requests: { path: string; auth: string | undefined; body: unknown }[] =
		[];
	const events = [
		[
			{
				choices: [
					{
						delta: {
							tool_calls: [
								{
									index: 0,
									id: "search-id",
									function: {
										name: "search_reference",
										arguments: '{"query":"circle"}',
									},
								},
							],
						},
						finish_reason: "tool_calls",
					},
				],
			},
		],
		[
			{
				choices: [
					{
						delta: {
							tool_calls: [
								{
									index: 0,
									id: "read-id",
									function: {
										name: "read_reference",
										arguments: '{"section":"Drawing"}',
									},
								},
							],
						},
						finish_reason: "tool_calls",
					},
				],
			},
		],
		[{ choices: [{ delta: { content: "Three." }, finish_reason: "stop" }] }],
	];
	const server = createServer(async (request, response) => {
		const body: Buffer[] = [];
		for await (const chunk of request) body.push(Buffer.from(chunk));
		requests.push({
			path: request.url ?? "",
			auth: request.headers.authorization,
			body: JSON.parse(Buffer.concat(body).toString("utf8")),
		});
		response.writeHead(200, { "content-type": "text/event-stream" });
		response.end(
			events[requests.length - 1]!.map(
				(event) => `data: ${JSON.stringify(event)}\n\n`,
			).join("") + "data: [DONE]\n\n",
		);
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	try {
		const address = server.address();
		assert(address && typeof address !== "string");
		const reference = readFileSync(
			new URL(
				"../packages/content/content/skills/gic-agent/references/language.md",
				import.meta.url,
			),
			"utf8",
		);
		const result = await runModel(
			"z-ai/glm-5.3",
			"test-key",
			reference,
			"chat",
			`http://127.0.0.1:${address.port}/api/v1/chat/completions`,
		);
		assert.equal(result.passed, true);
		assert.deepEqual(result.report.toolNames, [
			"search_reference",
			"read_reference",
		]);
		assert.equal(requests.length, 3);
		assert(
			requests.every(
				(item) =>
					item.path === "/api/v1/chat/completions" &&
					item.auth === "Bearer test-key",
			),
		);
		const [first, second, third] = requests.map(
			(item) =>
				item.body as {
					tool_choice: string;
					messages: { role: string; tool_call_id?: string }[];
				},
		);
		assert.equal(first?.tool_choice, "required");
		assert.deepEqual(
			second?.messages.map((message) => message.role),
			["user", "assistant", "tool"],
		);
		assert.equal(second?.messages.at(-1)?.tool_call_id, "search-id");
		assert.equal(third?.messages.at(-1)?.tool_call_id, "read-id");
		assert.equal(third?.tool_choice, "none");
	} finally {
		server.close();
	}
});

test("--help needs no OpenRouter key", () => {
	const result = spawnSync(
		process.execPath,
		[
			fileURLToPath(
				new URL("./openrouter-reference-smoke.ts", import.meta.url),
			),
			"--help",
		],
		{
			encoding: "utf8",
			timeout: 5_000,
			env: { ...process.env, OPENROUTER_API_KEY: "" },
		},
	);
	assert.equal(result.status, 0);
	assert.match(result.stdout, /Usage:/);
});
