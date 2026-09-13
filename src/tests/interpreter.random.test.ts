// ABOUTME: Verifies seeded and unseeded randomness through the GIC source pipeline.
// ABOUTME: Covers p5-compatible sequences, per-run state, bounds, and diagnostics.

import assert from "node:assert";
import test from "node:test";
import { runSource } from "../core.ts";

test("runSource keeps unseeded random values inside the requested half-open range", () => {
	const source = `let value = random(-5, 10);
if (value >= -5 && value < 10) {
	circle(10, 10, 5);
}`;
	const actual = runSource(source);

	assert.deepStrictEqual(actual, {
		ok: true,
		commands: [{ type: "circle", x: 10, y: 10, radius: 5 }],
		diagnostics: [],
		output: [],
	});
});

test("runSource produces the p5-compatible sequence after seeding", () => {
	const source = `randomSeed(42);
circle(random(10, 20), random(10, 20), 1);`;
	const actual = runSource(source);

	assert.deepStrictEqual(actual, {
		ok: true,
		commands: [
			{
				type: "circle",
				x: 12.523451747838408,
				y: 10.881250454112887,
				radius: 1,
			},
		],
		diagnostics: [],
		output: [],
	});
});

test("runSource restarts the seeded sequence after reseeding", () => {
	const source = `randomSeed(42);
let first = random(10, 20);
randomSeed(42);
circle(first, random(10, 20), 1);`;
	const actual = runSource(source);

	assert.deepStrictEqual(actual, {
		ok: true,
		commands: [
			{
				type: "circle",
				x: 12.523451747838408,
				y: 12.523451747838408,
				radius: 1,
			},
		],
		diagnostics: [],
		output: [],
	});
});

test("runSource does not share seeded random state between interpreter runs", () => {
	const source = `randomSeed(42);
circle(random(0, 1), 0, 1);`;

	const firstRun = runSource(source);
	const secondRun = runSource(source);
	const expected = {
		ok: true,
		commands: [
			{
				type: "circle",
				x: 0.2523451747838408,
				y: 0,
				radius: 1,
			},
		],
		diagnostics: [],
		output: [],
	};

	assert.deepStrictEqual(firstRun, expected);
	assert.deepStrictEqual(secondRun, expected);
});

test("runSource coerces a negative random seed to an unsigned 32-bit integer", () => {
	const actual = runSource(`randomSeed(-1); circle(random(0, 1), 0, 1);`);

	assert.deepStrictEqual(actual, {
		ok: true,
		commands: [
			{
				type: "circle",
				x: 0.2356804204173386,
				y: 0,
				radius: 1,
			},
		],
		diagnostics: [],
		output: [],
	});
});

test("runSource truncates a fractional random seed during unsigned coercion", () => {
	const actual = runSource(`randomSeed(1.9); circle(random(0, 1), 0, 1);`);

	assert.deepStrictEqual(actual, {
		ok: true,
		commands: [
			{
				type: "circle",
				x: 0.23645552527159452,
				y: 0,
				radius: 1,
			},
		],
		diagnostics: [],
		output: [],
	});
});

test("runSource rejects equal random bounds", () => {
	const actual = runSource(`random(10, 10);`);

	assert.deepStrictEqual(actual, {
		ok: false,
		diagnostics: [
			{
				message:
					"Function 'random' requires argument 'min' to be less than argument 'max'.",
				line: 0,
				start: 0,
				end: 6,
			},
		],
		output: [],
	});
});

test("runSource rejects reversed random bounds", () => {
	const actual = runSource(`random(10, 5);`);

	assert.deepStrictEqual(actual, {
		ok: false,
		diagnostics: [
			{
				message:
					"Function 'random' requires argument 'min' to be less than argument 'max'.",
				line: 0,
				start: 0,
				end: 6,
			},
		],
		output: [],
	});
});

test("runSource rejects a dynamically supplied non-number random minimum", () => {
	const source = `let minimum = "low";
random(minimum, 10);`;
	const actual = runSource(source);

	assert.deepStrictEqual(actual, {
		ok: false,
		diagnostics: [
			{
				message: "Function 'random' requires a number for argument 'min'.",
				line: 1,
				start: 21,
				end: 27,
			},
		],
		output: [],
	});
});

test("runSource rejects a dynamically supplied non-number random maximum", () => {
	const source = `let maximum = "high";
random(0, maximum);`;
	const actual = runSource(source);

	assert.deepStrictEqual(actual, {
		ok: false,
		diagnostics: [
			{
				message: "Function 'random' requires a number for argument 'max'.",
				line: 1,
				start: 22,
				end: 28,
			},
		],
		output: [],
	});
});

test("runSource rejects a dynamically supplied non-number random seed", () => {
	const source = `let seed = "x";
randomSeed(seed);`;
	const actual = runSource(source);

	assert.deepStrictEqual(actual, {
		ok: false,
		diagnostics: [
			{
				message: "Function 'randomSeed' requires a number for argument 'seed'.",
				line: 1,
				start: 16,
				end: 26,
			},
		],
		output: [],
	});
});
