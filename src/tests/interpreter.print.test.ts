// ABOUTME: Verifies print output through the complete GIC source pipeline.
// ABOUTME: Checks printed text and source location without drawing commands.

import assert from "node:assert";
import test from "node:test";
import { runSource } from "../core.ts";

test("runSource captures print output", () => {
	const actual = runSource('print("hello");');

	assert.deepStrictEqual(actual, {
		ok: true,
		commands: [],
		diagnostics: [],
		output: [{ text: "hello", line: 0, start: 0, end: 5 }],
	});
});
