// ABOUTME: Verifies CSS-color source ranges within GIC string literals.
// ABOUTME: Covers complete colors, embedded colors, edits, and excluded comments.

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

test("finds separate swatches for colors in declarations and prose strings", () => {
	const source = [
		'background("pink");',
		'let col = "pink";',
		'let hex = "#ff6347";',
		'let nameString = "this is lightgoldenrodyellow color";',
		'let hexInString = "this is tomato #ff6347 would be nice";',
	].join("\n");
	const secondHex = source.indexOf("#ff6347", source.indexOf("#ff6347") + 1);

	assert.deepEqual(colorRanges(source), [
		{
			color: "pink",
			start: source.indexOf("pink"),
			end: source.indexOf("pink") + 4,
		},
		{
			color: "pink",
			start: source.indexOf("pink", source.indexOf("pink") + 1),
			end: source.indexOf("pink", source.indexOf("pink") + 1) + 4,
		},
		{
			color: "#ff6347",
			start: source.indexOf("#ff6347"),
			end: source.indexOf("#ff6347") + 7,
		},
		{
			color: "lightgoldenrodyellow",
			start: source.indexOf("lightgoldenrodyellow"),
			end: source.indexOf("lightgoldenrodyellow") + 20,
		},
		{
			color: "tomato",
			start: source.indexOf("tomato"),
			end: source.indexOf("tomato") + 6,
		},
		{ color: "#ff6347", start: secondHex, end: secondHex + 7 },
	]);
});

test("ignores comments, invalid colors, and color names inside larger words", () => {
	assert.deepEqual(
		colorRanges(
			'// print("red")\nprint("notacolor greenish #ff634 #ff63xz"); ' +
				'let label = "reddish #ff6347suffix bluebird Blue!"; let pink = 1;',
		),
		[{ color: "Blue", start: 104, end: 108 }],
	);
});

test("keeps comment markers inside strings and ignores quoted colors in comments", () => {
	const source = 'let label = "tomato // #ff6347"; // "pink"';
	assert.deepEqual(
		colorRanges(source).map(({ color }) => color),
		["tomato", "#ff6347"],
	);
});

test("decorates color strings within compound and nested expressions", () => {
	assert.deepEqual(
		colorRanges(
			'fill("red" 2); fill("red" + suffix); ' +
				'fill("red", mix("blue")); fill(("red")); ' +
				'fill(makeColor("red")); fill("red" + "blue");',
		).map(({ color }) => color),
		["red", "red", "red", "blue", "red", "red", "red", "blue"],
	);
});

test("decorates colors in calls with extra arguments", () => {
	assert.deepEqual(
		colorRanges('background("blue"); fill("red", 1); stroke("green");').map(
			({ color }) => color,
		),
		["blue", "red", "green"],
	);
});

test("ignores unterminated strings until the next line", () => {
	assert.deepEqual(colorRanges('fill("red);\nfill("green");'), [
		{ color: "green", start: 18, end: 23 },
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
