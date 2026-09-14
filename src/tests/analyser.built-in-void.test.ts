// ABOUTME: Tests value-context diagnostics for void built-in function calls.
// ABOUTME: Covers standalone legality, expression contexts, priority, and traversal.

import assert from "node:assert";
import test, { describe } from "node:test";
import { analyseSource } from "./analyse-test-helper.ts";

const voidMessage = (name: string) =>
	`Function '${name}' does not return a value and cannot be used in an expression.`;

describe("Analyser built-in void calls", () => {
	test("should accept randomSeed as a standalone statement", () => {
		const result = analyseSource(`randomSeed(42);`);

		assert.deepStrictEqual(result.diagnostics, []);
	});

	test("should accept a drawing call as a standalone statement", () => {
		const result = analyseSource(`circle(10, 20, 3);`);

		assert.deepStrictEqual(result.diagnostics, []);
	});

	test("should accept print as a standalone statement", () => {
		const result = analyseSource(`print("hello");`);

		assert.deepStrictEqual(result.diagnostics, []);
	});

	test("should report randomSeed used as an initializer", () => {
		const result = analyseSource(`let value=randomSeed(1);`);

		assert.deepStrictEqual(result.diagnostics, [
			{
				message: voidMessage("randomSeed"),
				line: 0,
				start: 10,
				end: 20,
			},
		]);
	});

	test("should report a drawing call used in an operator", () => {
		const result = analyseSource(`let value=1+circle(1,2,3);`);

		assert.deepStrictEqual(result.diagnostics, [
			{
				message: voidMessage("circle"),
				line: 0,
				start: 12,
				end: 18,
			},
		]);
	});

	test("should report print used as a return value", () => {
		const result = analyseSource(`func show(){return print("x");}`);

		assert.deepStrictEqual(result.diagnostics, [
			{
				message: voidMessage("print"),
				line: 0,
				start: 19,
				end: 24,
			},
		]);
	});

	test("should report a void built-in used as a call argument", () => {
		const result = analyseSource(`floor(randomSeed(1));`);

		assert.deepStrictEqual(result.diagnostics, [
			{
				message: voidMessage("randomSeed"),
				line: 0,
				start: 6,
				end: 16,
			},
		]);
	});

	test("should prioritize arity over void-value misuse", () => {
		const result = analyseSource(`let value=print();`);

		assert.deepStrictEqual(result.diagnostics, [
			{
				message: "Function 'print' expects 1 arguments, but got 0.",
				line: 0,
				start: 10,
				end: 15,
			},
		]);
	});

	test("should prioritize literal kind over void-value misuse", () => {
		const result = analyseSource(`let value=randomSeed("seed");`);

		assert.deepStrictEqual(result.diagnostics, [
			{
				message: "Function 'randomSeed' requires a number for argument 'seed'.",
				line: 0,
				start: 10,
				end: 20,
			},
		]);
	});

	test("should continue walking arguments after a void-value diagnostic", () => {
		const result = analyseSource(`let value=print(missing);`);

		assert.deepStrictEqual(result.diagnostics, [
			{
				message: voidMessage("print"),
				line: 0,
				start: 10,
				end: 15,
			},
			{
				message: "Cannot find name 'missing'.",
				line: 0,
				start: 16,
				end: 23,
			},
		]);
	});
});
