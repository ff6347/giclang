// ABOUTME: Parses streamed provider events and serializes correlated tool results.
// ABOUTME: Keeps protocol-specific data handling separate from network orchestration.

export const chatModels = [
	"big-pickle",
	"glm-5.3",
	"glm-5.3-flash",
	"kimi-k3",
	"kimi-k2.7-code",
	"mimo-v2.6-flash-free",
	"deepseek-v4.1-flash",
	"deepseek-v4-pro",
	"deepseek-v4-flash",
	"space-bunny-free",
] as const;
export type Model =
	| (typeof chatModels)[number]
	| "gpt-6-luna"
	| "claude-sonnet-5";
export type ToolName = "search_reference" | "read_reference";
export type Call = { id: string; name: string; arguments: string };
type Parsed = {
	calls: Call[];
	textLength: number;
	terminalReason: string | null;
};

function record(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

export function parseToolEvents(raw: string, model: Model): Parsed {
	const calls = new Map<number, Call>();
	let textLength = 0;
	let terminalReason: string | null = null;
	for (const line of raw.split(/\r?\n/)) {
		if (!line.startsWith("data:")) continue;
		const payload = line.slice(5).trim();
		if (!payload || payload === "[DONE]") continue;
		let event: Record<string, unknown> | null;
		try {
			event = record(JSON.parse(payload));
		} catch {
			continue;
		}
		if (!event) continue;
		if (model !== "gpt-6-luna" && model !== "claude-sonnet-5") {
			for (const choice of Array.isArray(event.choices) ? event.choices : []) {
				const item = record(choice);
				const delta = record(item?.delta);
				if (typeof item?.finish_reason === "string")
					terminalReason = item.finish_reason;
				if (typeof delta?.content === "string")
					textLength += delta.content.length;
				for (const part of Array.isArray(delta?.tool_calls)
					? delta.tool_calls
					: []) {
					const tool = record(part);
					const fn = record(tool?.function);
					const index =
						typeof tool?.index === "number" ? tool.index : calls.size;
					const prior = calls.get(index);
					calls.set(index, {
						id: typeof tool?.id === "string" ? tool.id : (prior?.id ?? ""),
						name: typeof fn?.name === "string" ? fn.name : (prior?.name ?? ""),
						arguments:
							(prior?.arguments ?? "") +
							(typeof fn?.arguments === "string" ? fn.arguments : ""),
					});
				}
			}
		} else if (model === "gpt-6-luna") {
			if (event.type === "response.output_item.done") {
				const item = record(event.item);
				if (item?.type === "function_call") {
					calls.set(calls.size, {
						id: typeof item.call_id === "string" ? item.call_id : "",
						name: typeof item.name === "string" ? item.name : "",
						arguments: typeof item.arguments === "string" ? item.arguments : "",
					});
				}
			}
			if (
				event.type === "response.output_text.delta" &&
				typeof event.delta === "string"
			) {
				textLength += event.delta.length;
			}
			if (event.type === "response.completed") terminalReason = "completed";
			if (event.type === "response.failed") terminalReason = "failed";
		} else {
			if (event.type === "content_block_start") {
				const block = record(event.content_block);
				if (block?.type === "tool_use") {
					const index =
						typeof event.index === "number" ? event.index : calls.size;
					const input = record(block.input);
					calls.set(index, {
						id: typeof block.id === "string" ? block.id : "",
						name: typeof block.name === "string" ? block.name : "",
						arguments:
							input && Object.keys(input).length > 0
								? JSON.stringify(input)
								: "",
					});
				}
			}
			if (event.type === "content_block_delta") {
				const delta = record(event.delta);
				if (
					delta?.type === "input_json_delta" &&
					typeof delta.partial_json === "string"
				) {
					const index =
						typeof event.index === "number" ? event.index : calls.size - 1;
					const prior = calls.get(index);
					if (prior)
						calls.set(index, {
							...prior,
							arguments: prior.arguments + delta.partial_json,
						});
				}
				if (typeof delta?.text === "string") textLength += delta.text.length;
			}
			if (event.type === "message_delta") {
				const delta = record(event.delta);
				terminalReason =
					typeof delta?.stop_reason === "string" ? delta.stop_reason : null;
			}
		}
	}
	return { calls: [...calls.values()], textLength, terminalReason };
}

export function appendToolResults(
	model: Model,
	history: unknown[],
	calls: Call[],
	results: string[],
): unknown[] {
	if (calls.length !== results.length) throw new Error("invalid tool results");
	if (model !== "gpt-6-luna" && model !== "claude-sonnet-5") {
		return [
			...history,
			{
				role: "assistant",
				tool_calls: calls.map((call) => ({
					id: call.id,
					type: "function",
					function: { name: call.name, arguments: call.arguments },
				})),
			},
			...calls.map((call, index) => ({
				role: "tool",
				tool_call_id: call.id,
				content: results[index],
			})),
		];
	}
	if (model === "gpt-6-luna") {
		return [
			...history,
			...calls.map((call) => ({
				type: "function_call",
				call_id: call.id,
				name: call.name,
				arguments: call.arguments,
			})),
			...calls.map((call, index) => ({
				type: "function_call_output",
				call_id: call.id,
				output: results[index],
			})),
		];
	}
	return [
		...history,
		{
			role: "assistant",
			content: calls.map((call) => ({
				type: "tool_use",
				id: call.id,
				name: call.name,
				input: JSON.parse(call.arguments),
			})),
		},
		{
			role: "user",
			content: calls.map((call, index) => ({
				type: "tool_result",
				tool_use_id: call.id,
				content: results[index],
			})),
		},
	];
}
