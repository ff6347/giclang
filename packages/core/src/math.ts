// ABOUTME: Implements pure numeric built-ins for runtime call dispatch.
// ABOUTME: Validates finite numeric arguments before applying math operations.

import { requireArgumentNumber } from "./arguments.ts";
import type { BuiltInKeys } from "./built-ins.ts";

import type { CallableInput } from "./callable-registry.ts";
import { GicError } from "./error.ts";
import type { Token } from "./tokens.ts";

export type MathCall = (input: CallableInput) => number;

export type EffectCall = (input: CallableInput) => void;

export const mathCalls: Partial<Record<BuiltInKeys, MathCall>> = {
	floor,
	ceil,
	abs,

	min,
	max,

	sin,
	cos,
	radians,
	degrees,

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

export function createRandomCalls(): [MathCall, EffectCall] {
	const m = 4294967296;
	// a - 1 should be divisible by m's prime factors
	const a = 1664525;
	// c and m should be co-prime
	const c = 1013904223;

	let state: number | undefined;

	const random: MathCall = ({ values, token }) => {
		const min = requireArgumentNumber(values[0], "min", token);
		const max = requireArgumentNumber(values[1], "max", token);
		validateFiniteNumber(min, token);
		validateFiniteNumber(max, token);
		if (min >= max)
			throw new GicError(
				"Function 'random' requires argument 'min' to be less than argument 'max'.",
				token.line,
				token.start,
				token.end,
			);
		if (state === undefined) {
			return Math.random() * (max - min) + min;
		}
		state = (a * state + c) % m;
		return (state / m) * (max - min) + min;
	};
	const randomSeed: EffectCall = ({ values, token }) => {
		const seedValue = requireArgumentNumber(values[0], "seed", token);
		validateFiniteNumber(seedValue, token);
		state = seedValue >>> 0;
	};

	return [random, randomSeed];
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
	if (value < 0) {
		throw new GicError(
			"Function 'sqrt' must produce a finite number.",
			token.line,
			token.start,
			token.end,
		);
	}

	return Math.sqrt(value);
}

export function pow({ values, token }: CallableInput): number {
	const base = requireArgumentNumber(values[0], "base", token);
	const exponent = requireArgumentNumber(values[1], "exponent", token);
	validateFiniteNumber(base, token);
	validateFiniteNumber(exponent, token);

	const result = Math.pow(base, exponent);
	if (!Number.isFinite(result)) {
		throw new GicError(
			"Function 'pow' must produce a finite number.",
			token.line,
			token.start,
			token.end,
		);
	}
	return result;
}

export function sin({ values, token }: CallableInput): number {
	const degrees = requireArgumentNumber(values[0], "degrees", token);
	validateFiniteNumber(degrees, token);
	return Math.sin(degreesToRadians(degrees));
}

export function radians({ values, token }: CallableInput): number {
	const degrees = requireArgumentNumber(values[0], "degrees", token);
	validateFiniteNumber(degrees, token);
	return degreesToRadians(degrees);
}

export function cos({ values, token }: CallableInput): number {
	const degrees = requireArgumentNumber(values[0], "degrees", token);
	validateFiniteNumber(degrees, token);
	return Math.cos(degreesToRadians(degrees));
}

export function degrees({ values, token }: CallableInput): number {
	const radians = requireArgumentNumber(values[0], "radians", token);
	validateFiniteNumber(radians, token);
	const result = radiansToDegrees(radians);
	if (!Number.isFinite(result)) {
		throw new GicError(
			"Function 'degrees' must produce a finite number.",
			token.line,
			token.start,
			token.end,
		);
	}
	return result;
}

const degreesToRadians = (degrees: number): number => degrees * (Math.PI / 180);
const radiansToDegrees = (radians: number): number => radians * (180 / Math.PI);
