// ABOUTME: Sends bounded smoke requests to the four OpenCode Zen model routes.
// ABOUTME: Reports only status and response text length, never request secrets or content.

type Probe = {
	model: string;
	family: "chat-completions" | "responses" | "messages" | "generateContent";
	path: string;
	body: Record<string, unknown>;
};

type StreamSummary = {
	textLength: number;
	completed: boolean;
	errorEvent: boolean;
};

const prompt = "Reply with OK.";
const probes: Probe[] = [
	{
		model: "space-bunny-free",
		family: "chat-completions",
		path: "/zen/v1/chat/completions",
		body: {
			model: "space-bunny-free",
			messages: [{ role: "user", content: prompt }],
			max_tokens: 128,
			stream: true,
		},
	},
	{
		model: "gpt-5.6-terra",
		family: "responses",
		path: "/zen/v1/responses",
		body: {
			model: "gpt-5.6-terra",
			input: prompt,
			max_output_tokens: 128,
			stream: true,
		},
	},
	{
		model: "claude-sonnet-4-6",
		family: "messages",
		path: "/zen/v1/messages",
		body: {
			model: "claude-sonnet-4-6",
			max_tokens: 128,
			messages: [{ role: "user", content: prompt }],
			stream: true,
		},
	},
	{
		model: "gemini-3.7-flash",
		family: "generateContent",
		path: "/zen/v1/models/gemini-3.7-flash:streamGenerateContent?alt=sse",
		body: {
			contents: [{ role: "user", parts: [{ text: prompt }] }],
			generationConfig: { maxOutputTokens: 128 },
		},
	},
];

export function summarizeSse(
	raw: string,
	family: Probe["family"],
): StreamSummary {
	let textLength = 0;
	let completed = false;
	let errorEvent = false;
	let terminalReason: string | null = null;
	let streamEnded = false;
	for (const line of raw.split(/\r?\n/)) {
		if (!line.startsWith("data:")) continue;
		const payload = line.slice(5).trim();
		if (payload === "[DONE]") {
			if (family === "chat-completions") streamEnded = true;
			continue;
		}
		if (!payload) continue;
		try {
			const event = asRecord(JSON.parse(payload));
			if (event === null) continue;
			if (
				event.error !== undefined ||
				event.type === "error" ||
				event.type === "response.failed"
			) {
				errorEvent = true;
			}
			if (family === "responses") {
				if (
					event.type === "response.output_text.delta" &&
					typeof event.delta === "string"
				) {
					textLength += event.delta.length;
				}
				if (event.type === "response.completed") completed = true;
			} else if (family === "messages") {
				const delta = asRecord(event.delta);
				if (
					event.type === "content_block_delta" &&
					typeof delta?.text === "string"
				) {
					textLength += delta.text.length;
				}
				if (
					event.type === "message_delta" &&
					typeof delta?.stop_reason === "string"
				) {
					terminalReason = delta.stop_reason;
				}
				if (event.type === "message_stop") streamEnded = true;
			} else if (family === "chat-completions") {
				for (const choice of Array.isArray(event.choices)
					? event.choices
					: []) {
					const item = asRecord(choice);
					const delta = asRecord(item?.delta);
					if (typeof delta?.content === "string") {
						textLength += delta.content.length;
					}
					if (typeof item?.finish_reason === "string") {
						terminalReason = item.finish_reason;
					}
				}
			} else {
				for (const candidate of Array.isArray(event.candidates)
					? event.candidates
					: []) {
					const item = asRecord(candidate);
					const content = asRecord(item?.content);
					for (const part of Array.isArray(content?.parts)
						? content.parts
						: []) {
						const text = asRecord(part)?.text;
						if (typeof text === "string") textLength += text.length;
					}
					if (item?.finishReason === "STOP") completed = true;
				}
			}
		} catch {
			errorEvent = true;
		}
	}
	if (family === "chat-completions") {
		completed = streamEnded && terminalReason === "stop";
	} else if (family === "messages") {
		completed = streamEnded && terminalReason === "end_turn";
	}
	return {
		textLength,
		completed: completed && textLength > 0 && !errorEvent,
		errorEvent,
	};
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

export function probeSucceeded(
	status: number | null,
	result: StreamSummary,
): boolean {
	return (
		status !== null &&
		status >= 200 &&
		status < 300 &&
		result.completed &&
		!result.errorEvent &&
		result.textLength > 0
	);
}

async function main(): Promise<void> {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.info(
			"Usage: node --env-file=/secure/path/zen.env scripts/zen-smoke.ts",
		);
		console.info(
			"Requires OPENCODE_API_KEY. Sends four sequential, bounded streaming smoke requests.",
		);
		return;
	}
	const key = process.env.OPENCODE_API_KEY;
	if (!key) {
		console.error("Missing OPENCODE_API_KEY.");
		process.exitCode = 1;
		return;
	}

	for (const probe of probes) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 30_000);
		try {
			const headers: Record<string, string> = {
				"content-type": "application/json",
			};
			if (probe.family === "messages") {
				headers["x-api-key"] = key;
				headers["anthropic-version"] = "2023-06-01";
			} else if (probe.family === "generateContent") {
				headers["x-goog-api-key"] = key;
			} else {
				headers.authorization = `Bearer ${key}`;
			}
			const response = await fetch(`https://opencode.ai${probe.path}`, {
				method: "POST",
				headers,
				body: JSON.stringify(probe.body),
				signal: controller.signal,
			});
			const result = response.ok
				? summarizeSse(await response.text(), probe.family)
				: { textLength: 0, completed: false, errorEvent: false };
			if (!response.ok) await response.body?.cancel();
			if (!probeSucceeded(response.status, result)) process.exitCode = 1;
			console.info(
				JSON.stringify({
					model: probe.model,
					family: probe.family,
					status: response.status,
					...result,
				}),
			);
		} catch {
			process.exitCode = 1;
			console.info(
				JSON.stringify({
					model: probe.model,
					family: probe.family,
					status: null,
					textLength: 0,
					completed: false,
				}),
			);
		} finally {
			clearTimeout(timeout);
		}
	}
}

if (import.meta.main) await main();
