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

	min,
	max,

	sin,
	cos,
	sqrt,
	pow,
	round,
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

export function round({ values, token }: CallableInput): number {
	const value = requireArgumentNumber(values[0], "value", token);
	validateFiniteNumber(value, token);
	return Math.round(value);
}

export function min({ values, token }: CallableInput): number {
	const a = requireArgumentNumber(values[0], "a", token);
	const b = requireArgumentNumber(values[1], "b", token);
	validateFiniteNumber(a, token);
	validateFiniteNumber(b, token);
	return Math.min(a, b);
}

export function max({ values, token }: CallableInput): number {
	const a = requireArgumentNumber(values[0], "a", token);
	const b = requireArgumentNumber(values[1], "b", token);
	validateFiniteNumber(a, token);
	validateFiniteNumber(b, token);
	return Math.max(a, b);
}

export function sqrt({ values, token }: CallableInput): number {
	const value = requireArgumentNumber(values[0], "value", token);
	validateFiniteNumber(value, token);
	return Math.sqrt(value);
}

export function pow({ values, token }: CallableInput): number {
	const value = requireArgumentNumber(values[0], "value", token);
	const exponent = requireArgumentNumber(values[1], "exponent", token);
	validateFiniteNumber(value, token);
	validateFiniteNumber(exponent, token);
	return Math.pow(value, exponent);
}

export function sin({ values, token }: CallableInput): number {
	const degrees = requireArgumentNumber(values[0], "degrees", token);
	validateFiniteNumber(degrees, token);
	return Math.sin(degreesToRadians(degrees));
}
export function cos({ values, token }: CallableInput): number {
	const degrees = requireArgumentNumber(values[0], "degrees", token);
	validateFiniteNumber(degrees, token);
	return Math.cos(degreesToRadians(degrees));
}

const degreesToRadians = (degrees: number): number => degrees * (Math.PI / 180);
