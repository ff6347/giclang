// ABOUTME: Validates evaluated drawing-function arguments before command creation.
// ABOUTME: Produces source-located diagnostics for invalid runtime values.

import { GicError } from "./error.ts";
import type { Token } from "./tokens.ts";

export function requireRange(
	value: number,
	argumentName: string,
	callee: Token,
	min: number,
	max: number,
): number {
	if (value < min || value > max || !Number.isFinite(value)) {
		throw new GicError(
			`Function '${callee.lexeme}' requires argument '${argumentName}' to be between ${min} and ${max}.`,
			callee.line,
			callee.start,
			callee.end,
		);
	}
	return value;
}

export function requireArgumentString(
	value: unknown,
	argumentName: string,
	callee: Token,
): string {
	if (typeof value !== "string") {
		throw new GicError(
			`Function '${callee.lexeme}' requires a string for argument '${argumentName}'.`,
			callee.line,
			callee.start,
			callee.end,
		);
	}
	return value;
}

export function requireArgumentNumber(
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
