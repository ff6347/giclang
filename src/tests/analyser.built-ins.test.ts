// ABOUTME: Tests static built-in argument-kind diagnostics from shared metadata.
// ABOUTME: Covers named parameters, overload selection, unknown values, and traversal.

import assert from "node:assert";
import test, { describe } from "node:test";
import { analyseSource } from "./analyse-test-helper.ts";

describe("Analyser built-in argument kinds", () => {
	test("should report a string literal passed to a numeric math parameter", () => {
		const result = analyseSource(`floor("high");`);

		assert.deepStrictEqual(result.diagnostics, [
			{
				message: "Function 'floor' requires a number for argument 'value'.",
				line: 0,
				start: 0,
				end: 5,
			},
		]);
	});

	test("should report a string literal passed to a numeric drawing parameter", () => {
		const result = analyseSource(`circle(1, "down", 3);`);

		assert.deepStrictEqual(result.diagnostics, [
			{
				message: "Function 'circle' requires a number for argument 'y'.",
				line: 0,
				start: 0,
				end: 6,
			},
		]);
	});

	test("should accept each color overload with matching literal kinds", () => {
		const source = `background("red");
fill(50, 20, 180);
stroke(50, 20, 180, 75);`;
		const result = analyseSource(source);

		assert.deepStrictEqual(result.diagnostics, []);
	});

	test("should select the string color overload by arity", () => {
		const result = analyseSource(`background(true);`);

		assert.deepStrictEqual(result.diagnostics, [
			{
				message:
					"Function 'background' requires a string for argument 'value'.",
				line: 0,
				start: 0,
				end: 10,
			},
		]);
	});

	test("should select the numeric color overload by arity", () => {
		const result = analyseSource(`background("red", 20, 180);`);

		assert.deepStrictEqual(result.diagnostics, [
			{
				message:
					"Function 'background' requires a number for argument 'lightness'.",
				line: 0,
				start: 0,
				end: 10,
			},
		]);
	});

	test("should leave variable argument kinds for runtime validation", () => {
		const source = `let shade = "high";
floor(shade);`;
		const result = analyseSource(source);

		assert.deepStrictEqual(result.diagnostics, []);
	});

	test("should recognize a signed number as a numeric argument", () => {
		const result = analyseSource(`floor(-1);`);

		assert.deepStrictEqual(result.diagnostics, []);
	});

	test("should continue walking arguments after a literal-kind diagnostic", () => {
		const result = analyseSource(`random("low", missing);`);

		assert.deepStrictEqual(result.diagnostics, [
			{
				message: "Function 'random' requires a number for argument 'min'.",
				line: 0,
				start: 0,
				end: 6,
			},
			{
				message: "Cannot find name 'missing'.",
				line: 0,
				start: 14,
				end: 21,
			},
		]);
	});
});
