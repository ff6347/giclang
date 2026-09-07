// ABOUTME: Validates evaluated drawing-function arguments before command creation.
// ABOUTME: Produces source-located diagnostics for invalid runtime values.

import { GicError } from "../error.ts";
import type { Token } from "../tokens.ts";

export function requireNumber(
	value: unknown,
	argumentName: string,
	callee: Token,
): number {
	if (typeof value !== "number") {
		throw new GicError(
			`Function '${callee.lexeme}' requires a number for argument '${argumentName}'.`,
			callee.line,
			callee.start,
			callee.end,
		);
	}
	return value;
}
