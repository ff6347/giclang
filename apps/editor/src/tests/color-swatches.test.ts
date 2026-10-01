// ABOUTME: Verifies CSS-color source ranges for GIC drawing arguments.
// ABOUTME: Covers accepted colors, source edits, and excluded string contexts.

import assert from "node:assert/strict";
import test from "node:test";
import { colorRanges } from "../lib/color-swatches.ts";

test("finds accepted names in background, fill, and stroke arguments", () => {
	const ranges = colorRanges(
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

test("finds supported hex colors alongside names in drawing arguments", () => {
	const source =
		'background("#f63"); fill("#F638"); stroke("#ff6347"); ' +
		'fill("#FF634780"); stroke("blue");';
	assert.deepEqual(colorRanges(source), [
		{
			color: "#f63",
			start: source.indexOf("#f63"),
			end: source.indexOf("#f63") + 4,
		},
		{
			color: "#F638",
			start: source.indexOf("#F638"),
			end: source.indexOf("#F638") + 5,
		},
		{
			color: "#ff6347",
			start: source.indexOf("#ff6347"),
			end: source.indexOf("#ff6347") + 7,
		},
		{
			color: "#FF634780",
			start: source.indexOf("#FF634780"),
			end: source.indexOf("#FF634780") + 9,
		},
		{
			color: "blue",
			start: source.indexOf("blue"),
			end: source.indexOf("blue") + 4,
		},
	]);
});

test("ignores invalid hex colors and hex strings outside direct color arguments", () => {
	assert.deepEqual(
		colorRanges(
			'print("#f63"); // fill("#f63")\n' +
				'fill("#ff634"); fill("#ff63xz"); fill("#f63", 1); fill(("#f63"));',
		),
		[],
	);
});

test("ignores unrelated strings, comments, and invalid names", () => {
	assert.deepEqual(
		colorRanges(
			'print("red"); background("notacolor"); // fill("blue")\n' +
				'fill("greenish");',
		),
		[],
	);
});

test("only decorates a complete direct first string argument", () => {
	assert.deepEqual(
		colorRanges(
			'fill("red" 2); fill("red" + suffix); ' +
				'fill("red", mix("blue")); fill(("red")); ' +
				'fill(makeColor("red")); fill("red" + "blue");',
		),
		[],
	);
});

test("does not decorate named colors in calls with extra arguments", () => {
	assert.deepEqual(
		colorRanges('background("blue"); fill("red", 1); stroke("green");'),
		[
			{ color: "blue", start: 12, end: 16 },
			{ color: "green", start: 44, end: 49 },
		],
	);
});

test("ignores malformed and unterminated strings", () => {
	assert.deepEqual(colorRanges('fill("red); fill("blue");\nfill("green");'), [
		{ color: "green", start: 32, end: 37 },
	]);
});

test("updates the range and name after source edits", () => {
	assert.deepEqual(colorRanges('background("tomato");'), [
		{ color: "tomato", start: 12, end: 18 },
	]);
	assert.deepEqual(colorRanges('background("gold");'), [
		{ color: "gold", start: 12, end: 16 },
	]);
});
