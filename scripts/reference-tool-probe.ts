// ABOUTME: Runs bounded reference-tool probes against a selected provider endpoint.
// ABOUTME: Returns protocol metadata without exposing prompts, reference text, or keys.

import {
	appendToolResults,
	parseToolEvents,
	type Protocol,
	type ToolName,
} from "./zen-reference-protocol.ts";
import { search, sectionOf, validCall } from "./zen-reference-content.ts";

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

export function safeToolName(name: string): string {
	return name === "search_reference" || name === "read_reference"
		? name
		: "unexpected";
}

export function safeTerminalReason(reason: string | null): string | null {
	if (reason === null) return null;
	return [
		"stop",
		"tool_calls",
		"length",
		"content_filter",
		"completed",
		"failed",
		"incomplete",
		"end_turn",
		"tool_use",
		"max_tokens",
		"error",
	].includes(reason)
		? reason
		: "unexpected";
}

export function requestBody(
	model: string,
	protocol: Protocol,
	input: unknown[],
	toolsEnabled: boolean,
	requiredTool?: ToolName,
): string {
	const protocolTools =
		protocol === "chat"
			? tools.map((tool) => ({
					type: "function",
					function: {
						name: tool.name,
						description: tool.description,
						parameters: tool.parameters,
					},
				}))
			: protocol === "messages"
				? tools.map((tool) => ({
						name: tool.name,
						description: tool.description,
						input_schema: tool.parameters,
					}))
				: tools;
	if (protocol === "chat") {
		return JSON.stringify({
			model,
			messages: input,
			max_tokens: maxOutput,
			stream: true,
			tools: toolsEnabled ? protocolTools : undefined,
			tool_choice: toolsEnabled ? "required" : "none",
		});
	}
	if (protocol === "responses") {
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
	model: string,
	key: string,
	input: unknown[],
	toolsEnabled: boolean,
	protocol: Protocol,
	url: string,
	requiredTool?: ToolName,
) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 30_000);
	try {
		const headers: Record<string, string> = {
			"content-type": "application/json",
		};
		if (protocol === "messages") {
			headers["x-api-key"] = key;
			headers["anthropic-version"] = "2023-06-01";
		} else headers.authorization = `Bearer ${key}`;
		const response = await fetch(url, {
			method: "POST",
			headers,
			body: requestBody(model, protocol, input, toolsEnabled, requiredTool),
			signal: controller.signal,
		});
		const parsed = response.ok
			? parseToolEvents(await response.text(), protocol)
			: { calls: [], textLength: 0, terminalReason: null };
		if (!response.ok) await response.body?.cancel();
		return { status: response.status, parsed };
	} finally {
		clearTimeout(timeout);
	}
}

export async function runModel(
	model: string,
	key: string,
	reference: string,
	protocol: Protocol,
	url: string,
): Promise<{ passed: boolean; report: Record<string, unknown> }> {
	const report: Record<string, unknown> = {
		model,
		statuses: {},
		toolNames: [],
		validArguments: [],
		searchTerminalReason: null,
		searchTextLength: 0,
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
			protocol === "responses"
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
		const first = await send(
			model,
			key,
			history,
			true,
			protocol,
			url,
			"search_reference",
		);
		statuses.search = first.status;
		report.searchTerminalReason = safeTerminalReason(
			first.parsed.terminalReason,
		);
		report.searchTextLength = first.parsed.textLength;
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
				history = appendToolResults(protocol, history, calls, results);
				if (paired) statuses.read = first.status;
				else {
					const read = await send(
						model,
						key,
						history,
						true,
						protocol,
						url,
						"read_reference",
					);
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
							history = appendToolResults(protocol, history, [call], [result]);
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
			const final = await send(model, key, history, false, protocol, url);
			statuses.final = final.status;
			report.terminalReason = safeTerminalReason(final.parsed.terminalReason);
			report.finalTextLength = final.parsed.textLength;
			finalHasTools = final.parsed.calls.length > 0;
		}
	} catch {
		// Report only bounded metadata; exception text may contain credentials or bodies.
	}
	report.statuses = statuses;
	report.toolNames = names.map(safeToolName);
	report.validArguments = validity;
	const passed =
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
		(protocol === "chat"
			? report.terminalReason === "stop"
			: protocol === "responses"
				? report.terminalReason === "completed"
				: report.terminalReason === "end_turn") &&
		typeof report.finalTextLength === "number" &&
		report.finalTextLength > 0;
	return { passed, report };
}
