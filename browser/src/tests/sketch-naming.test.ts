// ABOUTME: Verifies Processing-style new-sketch name generation.
// ABOUTME: Pins the date format and collision-avoidance behavior.

import assert from "node:assert/strict";
import test from "node:test";
import { nextSketchName } from "../lib/sketch-naming.ts";

test("nextSketchName uses the date and the first free letter", () => {
	const name = nextSketchName(new Set(), new Date(2026, 8, 23));

	assert.equal(name, "sketch_20260923a");
});

test("nextSketchName skips names already taken this session", () => {
	const taken = new Set(["sketch_20260923a", "sketch_20260923b"]);

	const name = nextSketchName(taken, new Date(2026, 8, 23));

	assert.equal(name, "sketch_20260923c");
});

test("nextSketchName pads single-digit month and day", () => {
	const name = nextSketchName(new Set(), new Date(2026, 0, 5));

	assert.equal(name, "sketch_20260105a");
});
