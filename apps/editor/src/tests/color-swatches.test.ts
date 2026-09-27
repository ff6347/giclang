// ABOUTME: Verifies named-color source ranges for GIC drawing arguments.
// ABOUTME: Covers accepted colors, source edits, and excluded string contexts.

import assert from "node:assert/strict";
import test from "node:test";
import { namedColorRanges } from "../lib/color-swatches.ts";

test("finds accepted names in background, fill, and stroke arguments", () => {
	const ranges = namedColorRanges(
		'background("red"); fill("Blue"); stroke("rebeccapurple");',
	);

	assert.deepEqual(
		ranges.map(({ color, start, end }) => ({ color, start, end })),
		[
			{ color: "red", start: 12, end: 15 },
			{ color: "Blue", start: 25, end: 29 },
			{ color: "rebeccapurple", start: 41, end: 54 },
		],
	);
});

test("ignores unrelated strings, comments, and invalid names", () => {
	assert.deepEqual(
		namedColorRanges(
			'print("red"); background("notacolor"); // fill("blue")\n' +
				'fill("greenish");',
		),
		[],
	);
});

test("only decorates a complete direct first string argument", () => {
	assert.deepEqual(
		namedColorRanges(
			'fill("red" 2); fill("red" + suffix); ' +
				'fill("red", mix("blue")); fill(("red")); ' +
				'fill(makeColor("red")); fill("red" + "blue");',
		),
		[{ color: "red", start: 43, end: 46 }],
	);
});

test("ignores malformed and unterminated strings", () => {
	assert.deepEqual(
		namedColorRanges('fill("red); fill("blue");\nfill("green");'),
		[{ color: "green", start: 32, end: 37 }],
	);
});

test("updates the range and name after source edits", () => {
	assert.deepEqual(namedColorRanges('background("tomato");'), [
		{ color: "tomato", start: 12, end: 18 },
	]);
	assert.deepEqual(namedColorRanges('background("gold");'), [
		{ color: "gold", start: 12, end: 16 },
	]);
});
