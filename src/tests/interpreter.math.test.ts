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
