// ABOUTME: Verifies built-in constants through interpreter drawing geometry.
// ABOUTME: Pins PI, WIDTH, and HEIGHT as ordinary identifier values.

import assert from "node:assert";
import test from "node:test";
import { runSource } from "../core.ts";

test("runSource resolves constants in drawing geometry", () => {
	const actual = runSource("circle(WIDTH / 2, HEIGHT / 2, PI);");

	assert.deepStrictEqual(actual, {
		ok: true,
		commands: [
			{
				type: "circle",
				x: 50,
				y: 50,
				radius: 3.141592653589793,
			},
		],
		diagnostics: [],
		output: [],
	});
});
