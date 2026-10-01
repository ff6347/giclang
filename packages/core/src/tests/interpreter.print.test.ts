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

test("runSource prints mixed arguments on one line", () => {
	const actual = runSource('print("a", 1);');

	assert.deepStrictEqual(actual, {
		ok: true,
		commands: [],
		diagnostics: [],
		output: [{ text: "a 1", line: 0, start: 0, end: 5 }],
	});
});

test("runSource formats multiple number and boolean prints in order at their print tokens", () => {
	const source = `print(12);
print(true);`;
	const actual = runSource(source);

	assert.deepStrictEqual(actual, {
		ok: true,
		commands: [],
		diagnostics: [],
		output: [
			{ text: "12", line: 0, start: 0, end: 5 },
			{ text: "true", line: 1, start: 11, end: 16 },
		],
	});
});

test("runSource locates function print output at the print in the function body", () => {
	const source = `func greet() {
print("inside");
return;
}
greet();`;
	const actual = runSource(source);

	assert.deepStrictEqual(actual, {
		ok: true,
		commands: [],
		diagnostics: [],
		output: [{ text: "inside", line: 1, start: 15, end: 20 }],
	});
});

test("runSource keeps print output when a later division by zero fails", () => {
	const source = `print("before");
let value = 1 / 0;`;
	const actual = runSource(source);

	assert.deepStrictEqual(actual, {
		ok: false,
		diagnostics: [
			{
				message: "Cannot divide by zero.",
				line: 1,
				start: 31,
				end: 32,
			},
		],
		output: [{ text: "before", line: 0, start: 0, end: 5 }],
	});
});

test("runSource returns no output for parser failures", () => {
	const source = `print("before")`;
	const actual = runSource(source);

	assert.deepStrictEqual(actual, {
		ok: false,
		diagnostics: [
			{
				message: "Expected ';' after expression",
				line: 0,
				start: 15,
				end: 15,
			},
		],
		output: [],
	});
});

test("runSource returns no output for analyzer failures", () => {
	const source = `print(missing);`;
	const actual = runSource(source);

	assert.deepStrictEqual(actual, {
		ok: false,
		diagnostics: [
			{
				message: "Cannot find name 'missing'.",
				line: 0,
				start: 6,
				end: 13,
			},
		],
		output: [],
	});
});
