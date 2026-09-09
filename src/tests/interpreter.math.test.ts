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
