// ABOUTME: Tests static built-in literal diagnostics from shared metadata.
// ABOUTME: Covers argument kinds, obvious domains, unknown values, and traversal.

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

describe("Analyser built-in literal domains", () => {
	test("should report a negative literal passed to sqrt", () => {
		const result = analyseSource(`sqrt(-1);`);

		assert.deepStrictEqual(result.diagnostics, [
			{
				message: "Function 'sqrt' must produce a finite number.",
				line: 0,
				start: 0,
				end: 4,
			},
		]);
	});

	test("should report a negative pow base with a fractional literal exponent", () => {
		const result = analyseSource(`pow(-2, 0.5);`);

		assert.deepStrictEqual(result.diagnostics, [
			{
				message: "Function 'pow' must produce a finite number.",
				line: 0,
				start: 0,
				end: 3,
			},
		]);
	});

	test("should report a zero pow base with a negative literal exponent", () => {
		const result = analyseSource(`pow(0, -1);`);

		assert.deepStrictEqual(result.diagnostics, [
			{
				message: "Function 'pow' must produce a finite number.",
				line: 0,
				start: 0,
				end: 3,
			},
		]);
	});

	test("should accept a negative pow base with an integer literal exponent", () => {
		const result = analyseSource(`pow(-2, 3);`);

		assert.deepStrictEqual(result.diagnostics, []);
	});

	test("should accept a positive pow base with a negative literal exponent", () => {
		const result = analyseSource(`pow(2, -3);`);

		assert.deepStrictEqual(result.diagnostics, []);
	});

	test("should report equal random literal bounds", () => {
		const result = analyseSource(`random(10, 10);`);

		assert.deepStrictEqual(result.diagnostics, [
			{
				message:
					"Function 'random' requires argument 'min' to be less than argument 'max'.",
				line: 0,
				start: 0,
				end: 6,
			},
		]);
	});

	test("should report reversed random literal bounds", () => {
		const result = analyseSource(`random(10, 5);`);

		assert.deepStrictEqual(result.diagnostics, [
			{
				message:
					"Function 'random' requires argument 'min' to be less than argument 'max'.",
				line: 0,
				start: 0,
				end: 6,
			},
		]);
	});

	test("should leave a grouped domain argument for runtime validation", () => {
		const result = analyseSource(`sqrt((-1));`);

		assert.deepStrictEqual(result.diagnostics, []);
	});

	test("should leave a call domain argument for runtime validation", () => {
		const result = analyseSource(`sqrt(pow(-2, 3));`);

		assert.deepStrictEqual(result.diagnostics, []);
	});

	test("should leave a variable domain argument for runtime validation", () => {
		const source = `let value = -1;
sqrt(value);`;
		const result = analyseSource(source);

		assert.deepStrictEqual(result.diagnostics, []);
	});

	test("should leave a computed domain argument for runtime validation", () => {
		const result = analyseSource(`sqrt(0 - 1);`);

		assert.deepStrictEqual(result.diagnostics, []);
	});
});
