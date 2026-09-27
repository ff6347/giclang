// ABOUTME: Verifies nested mathematical built-ins in drawing geometry.
// ABOUTME: Pins floor, ceil, and abs through direct circle arguments.

import assert from "node:assert";
import test from "node:test";
import { runSource } from "../core.ts";

test("runSource evaluates nested math calls in circle geometry", () => {
	const actual = runSource("circle(floor(10.9), ceil(19.1), abs(-3));");

	assert.deepStrictEqual(actual, {
		ok: true,
		commands: [{ type: "circle", x: 10, y: 20, radius: 3 }],
		diagnostics: [],
		output: [],
	});
});

test("runSource evaluates round, min, and max in circle geometry", () => {
	const actual = runSource("circle(round(10.4), min(20, 30), max(2, 3));");

	assert.deepStrictEqual(actual, {
		ok: true,
		commands: [{ type: "circle", x: 10, y: 20, radius: 3 }],
		diagnostics: [],
		output: [],
	});
});

test("runSource evaluates sqrt, pow, sin, and cos in line geometry", () => {
	const actual = runSource("line(sqrt(81), pow(2, 3), sin(90), cos(0));");

	assert.deepStrictEqual(actual, {
		ok: true,
		commands: [{ type: "line", x1: 9, y1: 8, x2: 1, y2: 1 }],
		diagnostics: [],
		output: [],
	});
});

test("runSource rejects a dynamically supplied non-number sqrt value", () => {
	const source = `let value = "not a number";
sqrt(value);`;
	const actual = runSource(source);

	assert.deepStrictEqual(actual, {
		ok: false,
		diagnostics: [
			{
				message: "Function 'sqrt' requires a number for argument 'value'.",
				line: 1,
				start: 28,
				end: 32,
			},
		],
		output: [],
	});
});

test("runSource rejects a dynamically supplied negative sqrt value", () => {
	const source = `let value = -1;
sqrt(value);`;
	const actual = runSource(source);

	assert.deepStrictEqual(actual, {
		ok: false,
		diagnostics: [
			{
				message: "Function 'sqrt' must produce a finite number.",
				line: 1,
				start: 16,
				end: 20,
			},
		],
		output: [],
	});
});

test("runSource accepts a negative pow base with an integer exponent", () => {
	const actual = runSource("circle(pow(-2, 3), 0, 1);");

	assert.deepStrictEqual(actual, {
		ok: true,
		commands: [{ type: "circle", x: -8, y: 0, radius: 1 }],
		diagnostics: [],
		output: [],
	});
});

test("runSource accepts a negative pow exponent with a positive base", () => {
	const actual = runSource("circle(pow(2, -3), 0, 1);");

	assert.deepStrictEqual(actual, {
		ok: true,
		commands: [{ type: "circle", x: 0.125, y: 0, radius: 1 }],
		diagnostics: [],
		output: [],
	});
});

test("runSource rejects dynamically supplied pow arguments that produce NaN", () => {
	const source = `let base = -1;
let exponent = 0.5;
pow(base, exponent);`;
	const actual = runSource(source);

	assert.deepStrictEqual(actual, {
		ok: false,
		diagnostics: [
			{
				message: "Function 'pow' must produce a finite number.",
				line: 2,
				start: 35,
				end: 38,
			},
		],
		output: [],
	});
});

test("runSource rejects dynamically supplied pow arguments that overflow", () => {
	const source = `let base = 10;
let exponent = 400;
pow(base, exponent);`;
	const actual = runSource(source);

	assert.deepStrictEqual(actual, {
		ok: false,
		diagnostics: [
			{
				message: "Function 'pow' must produce a finite number.",
				line: 2,
				start: 35,
				end: 38,
			},
		],
		output: [],
	});
});
