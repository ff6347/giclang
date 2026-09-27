// ABOUTME: Verifies computed static drawings through the real source pipeline.
// ABOUTME: Covers runtime values, assignments, comparisons, and conditional execution.

import test, { describe } from "node:test";
import { runSource } from "../core.ts";
import assert from "node:assert";

describe("slice 2: computed static drawing acceptance", () => {
	test("should not allow mixed types in conditions", () => {
		const source = `let a = 10;
let b = "hello";
if (a > b) {

}`;
		const actual = runSource(source);
		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Cannot compare non-number values.",
				line: 2,
				start: 35,
				end: 36,
			},
		]);
	});

	test("should only allow boolean values in conditions", () => {
		const source = `if (1) {
			circle(0,0,10);
}`;

		const actual = runSource(source);
		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Cannot use non-boolean value as condition.",
				line: 0,
				start: 0,
				end: 2,
			},
		]);
	});

	test("should compute shape properties with variable", () => {
		const source = `let size = 10;
circle(50, 50, size);
`;
		const actual = runSource(source);
		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 50, y: 50, radius: 10 },
		]);
	});

	test("should compute background properties with variable", () => {
		const source = `let tone = 10;
background(tone, 50, 50);
`;
		const actual = runSource(source);
		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{
				type: "background",
				color: { kind: "oklch", lightness: 10, chroma: 50, hue: 50 },
			},
		]);
	});

	test("should evaluate a grouped expression", () => {
		const source = `let radius = (2 * 5);
	circle(50, 50, radius);`;
		const actual = runSource(source);
		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 50, y: 50, radius: 10 },
		]);
	});

	test("should evaluate unary numeric negation", () => {
		const source = `let x = -10;
	circle(x, 50, 10);`;
		const actual = runSource(source);
		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: -10, y: 50, radius: 10 },
		]);
	});

	test("should evaluate unary boolean negation", () => {
		const source = `if (!false) {
	circle(50, 50, 10);
}`;
		const actual = runSource(source);
		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 50, y: 50, radius: 10 },
		]);
	});

	test("should reject unary numeric negation of a string", () => {
		const actual = runSource(`let x = -"no";`);
		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Cannot perform unary operation on non-number value.",
				line: 0,
				start: 8,
				end: 9,
			},
		]);
	});

	test("should reject unary boolean negation of a number", () => {
		const actual = runSource(`if (!1) {}`);
		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Cannot perform unary operation on non-boolean value.",
				line: 0,
				start: 4,
				end: 5,
			},
		]);
	});

	test("should compute binary value after assignment properties with variable for background", () => {
		const source = `let tone = 10;
tone = tone * 3;
background(tone, 50, 50);
`;
		const actual = runSource(source);
		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{
				type: "background",
				color: { kind: "oklch", lightness: 30, chroma: 50, hue: 50 },
			},
		]);
	});

	test("should compute binary value  properties with variable for background", () => {
		const source = `let tone = 10 * 3;
background(tone, 50, 50);
`;
		const actual = runSource(source);
		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{
				type: "background",
				color: { kind: "oklch", lightness: 30, chroma: 50, hue: 50 },
			},
		]);
	});
	test("should execute an if branch when its condition is true", () => {
		const source = `if (true) {
	circle(50, 50, 10);
}`;
		const actual = runSource(source);
		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 50, y: 50, radius: 10 },
		]);
	});

	test("should preserve declarations across statements in an if branch", () => {
		const source = `if (true) {
	let radius = 10;
	circle(50, 50, radius);
}`;
		const actual = runSource(source);
		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 50, y: 50, radius: 10 },
		]);
	});

	test("should execute only the else branch when the condition is false", () => {
		const source = `if (false) {
	circle(10, 10, 5);
} else {
	let radius = 10;
	circle(50, 50, radius);
}`;
		const actual = runSource(source);
		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 50, y: 50, radius: 10 },
		]);
	});

	test("should do nothing when a false condition has no else branch", () => {
		const actual = runSource(`if (false) {
	circle(10, 10, 5);
}`);
		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, []);
	});

	test("should execute the selected nested else-if branch", () => {
		const source = `if (false) {
	circle(10, 10, 5);
} else if (true) {
	circle(20, 20, 10);
} else {
	circle(30, 30, 15);
}`;
		const actual = runSource(source);
		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 20, y: 20, radius: 10 },
		]);
	});

	test("should compute shape properties through variables, assignment, arithmetic, and an if branch", () => {
		const source = `background(20, 0, 0);
let size = 10;
size = size * 3;
if (size > 20) {
	circle(50, 50, size);
}`;
		const actual = runSource(source);
		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{
				type: "background",
				color: { kind: "oklch", lightness: 20, chroma: 0, hue: 0 },
			},
			{ type: "circle", x: 50, y: 50, radius: 30 },
		]);
	});
});
