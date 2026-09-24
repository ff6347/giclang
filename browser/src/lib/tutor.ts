// ABOUTME: Defines the browser-neutral deterministic tutor contract and session records.
// ABOUTME: Keeps context assembly and local JSONL persistence independent from the React UI.

export interface TutorContext {
	readonly source: string;
	readonly diagnostics: readonly string[];
	readonly runtimeError: string | null;
	readonly output: readonly string[];
}

export interface TutorRequest {
	readonly question: string;
	readonly context: TutorContext;
}

export interface TutorProvider {
	stream(request: TutorRequest, signal: AbortSignal): AsyncIterable<string>;
}

export interface TutorMessage {
	readonly role: "student" | "tutor";
	readonly text: string;
}

export type TutorSessionRecord =
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
			readonly role: TutorMessage["role"];
			readonly text: string;
			readonly at: string;
	  }
	| {
			readonly type: "compaction";
			readonly sessionId: string;
			readonly at: string;
			readonly messageCount: number;
	  };

export function buildTutorContext(
	source: string,
	diagnostics: readonly string[],
	output: readonly string[],
	runtimeError: string | null = null,
): TutorContext {
	return {
		source,
		diagnostics: [...diagnostics],
		output: [...output],
		runtimeError,
	};
}

export function serializeTutorSession(
	records: readonly TutorSessionRecord[],
): string {
	return `${records.map((record) => JSON.stringify(record)).join("\n")}\n`;
}

export function parseTutorSession(serialized: string): TutorSessionRecord[] {
	const records: TutorSessionRecord[] = [];
	for (const line of serialized.split("\n")) {
		if (line.length === 0) continue;
		try {
			const value: unknown = JSON.parse(line);
			if (typeof value === "object" && value !== null && "type" in value) {
				records.push(value as TutorSessionRecord);
			}
		} catch {
			// A partial final line is ignored so a session can be recovered.
		}
	}
	return records;
}

export function createDeterministicTutor(): TutorProvider {
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

function deterministicAnswer(request: TutorRequest): string {
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
