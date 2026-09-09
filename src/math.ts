// ABOUTME: Implements pure numeric built-ins for runtime call dispatch.
// ABOUTME: Validates finite numeric arguments before applying math operations.

import { requireArgumentNumber } from "./arguments.ts";
import type { BuiltInKeys } from "./built-ins.ts";

import type { CallableInput } from "./callable-registry.ts";
import { GicError } from "./error.ts";
import type { Token } from "./tokens.ts";

export type MathCall = (input: CallableInput) => number;

export const mathCalls: Partial<Record<BuiltInKeys, MathCall>> = {
	floor,
	ceil,
	abs,
};

function validateFiniteNumber(value: number, token: Token): void {
	if (!Number.isFinite(value)) {
		throw new GicError(
			`Value '${value}' is not a finite number.`,
			token.line,
			token.start,
			token.end,
		);
	}
}

export function floor({ values, token }: CallableInput): number {
	const value = requireArgumentNumber(values[0], "value", token);
	validateFiniteNumber(value, token);
	return Math.floor(value);
}

export function ceil({ values, token }: CallableInput): number {
	const value = requireArgumentNumber(values[0], "value", token);
	validateFiniteNumber(value, token);
	return Math.ceil(value);
}

export function abs({ values, token }: CallableInput): number {
	const value = requireArgumentNumber(values[0], "value", token);
	validateFiniteNumber(value, token);
	return Math.abs(value);
}
