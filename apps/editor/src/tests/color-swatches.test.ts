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

test("updates the range and name after source edits", () => {
	assert.deepEqual(namedColorRanges('background("tomato");'), [
		{ color: "tomato", start: 12, end: 18 },
	]);
	assert.deepEqual(namedColorRanges('background("gold");'), [
		{ color: "gold", start: 12, end: 16 },
	]);
});
