import type { Token } from "./tokens.ts";

export class GicError extends Error {
	line: number;
	start: number;
	end: number;
	token: Token | undefined;

	constructor(location: Token | number, message: string) {
		super(message);
		this.name = "GicError";
		this.token = typeof location === "number" ? undefined : location;
		this.line = typeof location === "number" ? location : location.line;
		this.start = typeof location === "number" ? location : location.start;
		this.end = typeof location === "number" ? location : location.end;
	}
}

export class ParserError extends Error {
	token: Token | undefined;

	constructor(message: string, token: Token | undefined) {
		super(message);
		this.name = "ParserError";
		this.token = token;
	}
}
