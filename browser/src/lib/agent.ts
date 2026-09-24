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
	  }
	| {
			readonly type: "compaction";
			readonly sessionId: string;
			readonly at: string;
			readonly messageCount: number;
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

export function createDeterministicAgent(): AgentProvider {
	return {
		async *stream(request, signal) {
			const answer = deterministicAnswer(request);
			for (const character of answer) {
				if (signal.aborted) return;
				yield character;
				await Promise.resolve();
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
	return `You asked: ${request.question.trim()}. What is the smallest change you want to try?`;
}
