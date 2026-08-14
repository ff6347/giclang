import type { Token } from "./tokens.ts";

export class GicError extends Error {
	line: number;
	start: number;
	end: number;
	token: Token | undefined;

	constructor(message: string, token: Token | number) {
		super(message);
		this.name = "GicError";
		this.token = typeof token === "number" ? undefined : token;
		this.line = typeof token === "number" ? token : token.line;
		this.start = typeof token === "number" ? token : token.start;
		this.end = typeof token === "number" ? token : token.end;
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
