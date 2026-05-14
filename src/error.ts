import type { Token } from "./tokens.ts";

export class GicError extends Error {
	line: number;
	token: Token | undefined;

	constructor(location: Token | number, message: string) {
		super(message);
		this.name = "GicError";
		this.token = typeof location === "number" ? undefined : location;
		this.line = typeof location === "number" ? location : location.line;
	}
}
