// ABOUTME: Defines the browser-neutral deterministic agent contract and session records.
// ABOUTME: Keeps context assembly and local JSONL persistence independent from the React UI.

export interface AgentContext {
	readonly source: string;
	readonly diagnostics: readonly string[];
	readonly runtimeError: string | null;
	readonly output: readonly string[];
}

export interface AgentRequest {
	readonly question: string;
	readonly context: AgentContext;
}

export interface AgentProvider {
	stream(request: AgentRequest, signal: AbortSignal): AsyncIterable<string>;
}

import type { DesktopHost, OpencodeAgentEvent } from "./desktop-host.ts";

export interface AgentMessage {
	readonly role: "student" | "agent";
	readonly text: string;
}

export type AgentSessionRecord =
	| {
			readonly type: "session";
			readonly id: string;
			readonly name: string;
			readonly startedAt: string;
			readonly sketchId: string;
	  }
	| {
			readonly type: "message";
			readonly sessionId: string;
			readonly role: AgentMessage["role"];
			readonly text: string;
			readonly at: string;
	  };

export function buildAgentContext(
	source: string,
	diagnostics: readonly string[],
	output: readonly string[],
	runtimeError: string | null = null,
): AgentContext {
	return {
		source,
		diagnostics: [...diagnostics],
		output: [...output],
		runtimeError,
	};
}

export function serializeAgentSession(
	records: readonly AgentSessionRecord[],
): string {
	return `${records.map((record) => JSON.stringify(record)).join("\n")}\n`;
}

export function parseAgentSession(serialized: string): AgentSessionRecord[] {
	const records: AgentSessionRecord[] = [];
	for (const line of serialized.split("\n")) {
		if (line.length === 0) continue;
		try {
			const value: unknown = JSON.parse(line);
			if (typeof value === "object" && value !== null && "type" in value) {
				records.push(value as AgentSessionRecord);
			}
		} catch {
			// A partial final line is ignored so a session can be recovered.
		}
	}
	return records;
}

export interface DesktopAgentOptions {
	readonly model: string;
}

export function createDesktopAgent(
	desktop: DesktopHost,
	options: DesktopAgentOptions,
): AgentProvider {
	return {
		async *stream(request, signal) {
			const events: Extract<OpencodeAgentEvent, { kind: "text" }>[] = [];
			let wake: (() => void) | undefined;
			let unlisten: (() => void) | undefined;
			let terminal: "complete" | "cancelled" | "error" | undefined;
			let terminalError: Error | undefined;
			let finished = Promise.resolve();
			const onEvent = (event: OpencodeAgentEvent) => {
				if (terminal !== undefined) return;
				if (event.kind === "text") events.push(event);
				else if (event.kind === "error") {
					terminal = "error";
					terminalError = new Error(event.message);
				} else terminal = event.kind;
				finished = Promise.resolve();
				wake?.();
			};
			const waitForEvent = () => {
				finished = new Promise<void>((resolve) => {
					wake = resolve;
				});
				return finished;
			};
			unlisten = await desktop.onOpencodeAgentEvent(onEvent);
			const cancel = () => {
				void desktop.cancelOpencodeRequest();
			};
			signal.addEventListener("abort", cancel, { once: true });
			try {
				await desktop.sendOpencodeRequest({
					question: request.question,
					context: JSON.stringify(request.context),
					model: options.model,
				});
				while (terminal === undefined && !signal.aborted) {
					if (events.length > 0) {
						yield events.shift()!.text;
						continue;
					}
					await waitForEvent();
				}
				while (events.length > 0) yield events.shift()!.text;
				if (terminal === "error") throw terminalError;
			} finally {
				signal.removeEventListener("abort", cancel);
				unlisten?.();
			}
		},
	};
}

export function createDeterministicAgent(): AgentProvider {
	return {
		async *stream(request, signal) {
			const answer = deterministicAnswer(request);
			for (const character of answer) {
				if (signal.aborted) return;
				yield character;
				await new Promise((resolve) => setTimeout(resolve, 12));
			}
		},
	};
}

function deterministicAnswer(request: AgentRequest): string {
	const context = request.context;
	if (context.runtimeError !== null) {
		return `The preview reported: ${context.runtimeError}. What do you expect each drawing command to do?`;
	}
	if (context.diagnostics.length > 0) {
		return `The current sketch has ${context.diagnostics.length} diagnostic${context.diagnostics.length === 1 ? "" : "s"}. Which one should you resolve first?`;
	}
	if (context.output.length > 0) {
		return "The sketch runs and produced structured output. What pattern would you like to change?";
	}
	return `You asked: ${request.question.trim()}. What is the smallest change you want to try?\n\n\`\`\`gic\nrect(10, 10, 20, 20);\n\`\`\``;
}
