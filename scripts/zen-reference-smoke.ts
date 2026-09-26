// ABOUTME: Verifies model tool calls against the bundled GIC language reference.
// ABOUTME: Reports bounded protocol metadata without emitting prompts or content.

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
	appendToolResults,
	parseToolEvents,
	type Model,
	type ToolName,
} from "./zen-reference-protocol.ts";
import { search, sectionOf, validCall } from "./zen-reference-content.ts";

const models: Model[] = ["big-pickle", "gpt-6-luna", "claude-sonnet-5"];
const maxOutput = 256;
const tools = [
	{
		type: "function",
		name: "search_reference",
		description: "Search the GIC language reference.",
		parameters: {
			type: "object",
			properties: { query: { type: "string" } },
			required: ["query"],
			additionalProperties: false,
		},
	},
	{
		type: "function",
		name: "read_reference",
		description: "Read one named section of the GIC language reference.",
		parameters: {
			type: "object",
			properties: { section: { type: "string" } },
			required: ["section"],
			additionalProperties: false,
		},
	},
];

function record(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

export function parseArguments(argv: string[]): {
	model: Model | null;
	help: boolean;
	error: string | null;
} {
	if (argv.length === 1 && ["--help", "-h"].includes(argv[0]!)) {
		return { model: null, help: true, error: null };
	}
	if (
		argv.length === 2 &&
		argv[0] === "--model" &&
		models.includes(argv[1] as Model)
	) {
		return { model: argv[1] as Model, help: false, error: null };
	}
	if (argv.length === 0) return { model: null, help: false, error: null };
	return { model: null, help: false, error: "invalid arguments" };
}

function endpoint(model: Model): string {
	return model === "big-pickle"
		? "https://opencode.ai/zen/v1/chat/completions"
		: model === "gpt-6-luna"
			? "https://opencode.ai/zen/v1/responses"
			: "https://opencode.ai/zen/v1/messages";
}

function requestBody(
	model: Model,
	input: unknown[],
	toolsEnabled: boolean,
	requiredTool?: ToolName,
): string {
	const protocolTools =
		model === "big-pickle"
			? tools.map((tool) => ({
					type: "function",
					function: {
						name: tool.name,
						description: tool.description,
						parameters: tool.parameters,
					},
				}))
			: model === "claude-sonnet-5"
				? tools.map((tool) => ({
						name: tool.name,
						description: tool.description,
						input_schema: tool.parameters,
					}))
				: tools;
	if (model === "big-pickle") {
		return JSON.stringify({
			model,
			messages: input,
			max_tokens: maxOutput,
			stream: true,
			tools: toolsEnabled ? protocolTools : undefined,
			tool_choice: toolsEnabled
				? { type: "function", function: { name: requiredTool } }
				: "none",
		});
	}
	if (model === "gpt-6-luna") {
		return JSON.stringify({
			model,
			input,
			max_output_tokens: maxOutput,
			stream: true,
			tools: toolsEnabled ? protocolTools : undefined,
			tool_choice: toolsEnabled
				? { type: "function", name: requiredTool }
				: "none",
		});
	}
	return JSON.stringify({
		model,
		messages: input,
		max_tokens: maxOutput,
		stream: true,
		tools: toolsEnabled ? protocolTools : undefined,
		tool_choice: toolsEnabled
			? { type: "tool", name: requiredTool }
			: undefined,
	});
}

async function send(
	model: Model,
	key: string,
	input: unknown[],
	toolsEnabled: boolean,
	requiredTool?: ToolName,
) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 30_000);
	try {
		const headers: Record<string, string> = {
			"content-type": "application/json",
		};
		if (model === "claude-sonnet-5") {
			headers["x-api-key"] = key;
			headers["anthropic-version"] = "2023-06-01";
		} else headers.authorization = `Bearer ${key}`;
		const response = await fetch(endpoint(model), {
			method: "POST",
			headers,
			body: requestBody(model, input, toolsEnabled, requiredTool),
			signal: controller.signal,
		});
		const parsed = response.ok
			? parseToolEvents(await response.text(), model)
			: { calls: [], textLength: 0, terminalReason: null };
		if (!response.ok) await response.body?.cancel();
		return { status: response.status, parsed };
	} finally {
		clearTimeout(timeout);
	}
}

async function runModel(
	model: Model,
	key: string,
	reference: string,
): Promise<boolean> {
	const report: Record<string, unknown> = {
		model,
		statuses: {},
		toolNames: [],
		validArguments: [],
		terminalReason: null,
		finalTextLength: 0,
	};
	const statuses: Partial<Record<"search" | "read" | "final", number>> = {};
	const names: string[] = [];
	const validity: boolean[] = [];
	let finalHasTools = false;
	try {
		const prompt =
			"Search for circle, then read Drawing. In at most five words: how many arguments does circle take?";
		let history: unknown[] =
			model === "gpt-6-luna"
				? [
						{
							role: "user",
							content: [
								{
									type: "input_text",
									text: prompt,
								},
							],
						},
					]
				: [
						{
							role: "user",
							content: prompt,
						},
					];
		const first = await send(model, key, history, true, "search_reference");
		statuses.search = first.status;
		const calls = first.parsed.calls;
		if (
			first.status >= 200 &&
			first.status < 300 &&
			calls.length > 0 &&
			calls.length <= 2
		) {
			const paired = calls.length === 2;
			const results: string[] = [];
			const callIds = new Set<string>();
			let validRound = true;
			for (const [index, call] of calls.entries()) {
				const phase =
					paired && index === 1 ? "read_reference" : "search_reference";
				const argumentName = phase === "search_reference" ? "query" : "section";
				names.push(call.name);
				const valid =
					validCall(call, phase, argumentName) && !callIds.has(call.id);
				callIds.add(call.id);
				validity.push(valid);
				if (!valid) {
					validRound = false;
					continue;
				}
				const argument = record(JSON.parse(call.arguments))?.[argumentName];
				const result =
					phase === "search_reference"
						? search(reference, typeof argument === "string" ? argument : "")
						: sectionOf(
								reference,
								typeof argument === "string" ? argument : "",
							);
				if (!result) {
					validity[validity.length - 1] = false;
					validRound = false;
				} else results.push(result);
			}
			if (
				validRound &&
				(!paired || calls.length === 2) &&
				results.length === calls.length
			) {
				history = appendToolResults(model, history, calls, results);
				if (paired) statuses.read = first.status;
				else {
					const read = await send(model, key, history, true, "read_reference");
					statuses.read = read.status;
					const call = read.parsed.calls[0];
					if (
						read.status >= 200 &&
						read.status < 300 &&
						read.parsed.calls.length === 1 &&
						call
					) {
						names.push(call.name);
						const valid = validCall(call, "read_reference", "section");
						validity.push(valid);
						const section = record(JSON.parse(call.arguments))?.section;
						const result =
							valid && typeof section === "string"
								? sectionOf(reference, section)
								: "";
						if (result)
							history = appendToolResults(model, history, [call], [result]);
						else validity[validity.length - 1] = false;
					}
				}
			}
		}
		if (
			statuses.search !== undefined &&
			statuses.read !== undefined &&
			statuses.search >= 200 &&
			statuses.search < 300 &&
			statuses.read >= 200 &&
			statuses.read < 300 &&
			validity.length === 2 &&
			validity.every(Boolean)
		) {
			const final = await send(model, key, history, false);
			statuses.final = final.status;
			report.terminalReason = final.parsed.terminalReason;
			report.finalTextLength = final.parsed.textLength;
			finalHasTools = final.parsed.calls.length > 0;
		}
	} catch {
		// Report only bounded metadata; exception text may contain credentials or bodies.
	}
	report.statuses = statuses;
	report.toolNames = names;
	report.validArguments = validity;
	console.info(JSON.stringify(report));
	return (
		statuses.search !== undefined &&
		statuses.search >= 200 &&
		statuses.search < 300 &&
		statuses.read !== undefined &&
		statuses.read >= 200 &&
		statuses.read < 300 &&
		statuses.final !== undefined &&
		statuses.final >= 200 &&
		statuses.final < 300 &&
		names.join(",") === "search_reference,read_reference" &&
		validity.length === 2 &&
		validity.every(Boolean) &&
		!finalHasTools &&
		typeof report.terminalReason === "string" &&
		(model === "big-pickle"
			? report.terminalReason === "stop"
			: model === "gpt-6-luna"
				? report.terminalReason === "completed"
				: report.terminalReason === "end_turn") &&
		typeof report.finalTextLength === "number" &&
		report.finalTextLength > 0
	);
}

async function main(): Promise<void> {
	const args = parseArguments(process.argv.slice(2));
	if (args.help) {
		console.info(
			"Usage: node scripts/zen-reference-smoke.ts [--model big-pickle|gpt-6-luna|claude-sonnet-5]",
		);
		return;
	}
	if (args.error) {
		console.error("Invalid arguments. Use --help.");
		process.exitCode = 1;
		return;
	}
	const key = process.env.OPENCODE_API_KEY;
	if (!key) {
		console.error("Missing OPENCODE_API_KEY.");
		process.exitCode = 1;
		return;
	}
	const reference = await readFile(
		resolve(
			import.meta.dirname,
			"../src-tauri/workspace/gic-tutor/references/language.md",
		),
		"utf8",
	);
	for (const model of args.model ? [args.model] : models) {
		if (!(await runModel(model, key, reference))) process.exitCode = 1;
	}
}

if (import.meta.main) await main();
