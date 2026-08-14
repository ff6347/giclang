import type { Token } from "./tokens.ts";

export class GicError extends Error {
	line: number;
	start: number;
	end: number;

	constructor(message: string, line: number, start: number, end: number) {
		super(message);
		this.name = "GicError";
		this.line = line;
		this.start = start;
		this.end = end;
	}
}

export class ParserError extends Error {
	token: Token | undefined;
	line: number;
	start: number;
	end: number;

	constructor(message: string, token: Token | undefined) {
		super(message);
		this.name = "ParserError";
		this.token = token;
		this.line = token?.line ?? 0;
		this.start = token?.start ?? 0;
		this.end = token?.end ?? 0;
	}
}
