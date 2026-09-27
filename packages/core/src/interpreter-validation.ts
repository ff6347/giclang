// ABOUTME: Validates numeric values used by repeat statement execution.
// ABOUTME: Produces source-located diagnostics for invalid repeat values.

import { GicError } from "./error.ts";
import type { Token } from "./tokens.ts";

export function requireNumber(
	value: unknown,
	token: Token,
	message: string,
): number {
	if (typeof value !== "number") {
		throw new GicError(message, token.line, token.start, token.end);
	}
	return value;
}
