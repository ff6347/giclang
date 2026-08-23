// ABOUTME: Tests semantic analysis of return placement and inferred function kind.
// ABOUTME: Covers required returns, mixed kinds, and void calls in expression contexts.

import test, { describe } from "node:test";
import assert from "node:assert";
import { analyseSource } from "./analyse-test-helper.ts";

describe("Analyser returns", () => {
	test("should accept a function that explicitly returns no value", () => {
		const source = "func show(){return;}";
		const result = analyseSource(source);
		assert.strictEqual(result.diagnostics.length, 0);
	});

	test("should accept a function that explicitly returns a value", () => {
		const source = "func value(){return 1;}";
		const result = analyseSource(source);
		assert.strictEqual(result.diagnostics.length, 0);
	});

	test("should report every function without an explicit return", () => {
		const source = "func first(){}func second(){let x=1;}";
		const result = analyseSource(source);
		const expected = [
			{
				message: "Function 'first' must have a return statement.",
				line: 0,
				start: 5,
				end: 10,
			},
			{
				message: "Function 'second' must have a return statement.",
				line: 0,
				start: 19,
				end: 25,
			},
		];
		assert.strictEqual(result.diagnostics.length, 2);
		assert.deepStrictEqual(result.diagnostics, expected);
	});

	test("should reset return analysis between functions", () => {
		const source = "func first(){return 1;}func second(){}";
		const result = analyseSource(source);
		const expected = {
			message: "Function 'second' must have a return statement.",
			line: 0,
			start: 28,
			end: 34,
		};

		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should accept an explicit return in a nested block", () => {
		const source = "func maybe(x){if(x){return 1;}}";
		const result = analyseSource(source);
		assert.strictEqual(result.diagnostics.length, 0);
	});

	test("should report mixed return kinds in one function", () => {
		const source = "func choose(x){if(x){return 1;}else{return;}}";
		const result = analyseSource(source);
		const expected = {
			message: "Function 'choose' cannot return both a value and no value.",
			line: 0,
			start: 5,
			end: 11,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report return outside a function", () => {
		const source = "return;";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot return outside a function.",
			line: 0,
			start: 0,
			end: 6,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report return after a completed function", () => {
		const source = "func show(){return;}return;";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot return outside a function.",
			line: 0,
			start: 20,
			end: 26,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should accept a void call as a standalone statement", () => {
		const source = "func show(){return;}show();";
		const result = analyseSource(source);
		assert.strictEqual(result.diagnostics.length, 0);
	});

	test("should accept a value-returning call in an initializer", () => {
		const source = "func get(){return 1;}let x=get();";
		const result = analyseSource(source);
		assert.strictEqual(result.diagnostics.length, 0);
	});

	test("should report a void call used as an initializer", () => {
		const source = "func show(){return;}let x=show();";
		const result = analyseSource(source);
		const expected = {
			message:
				"Function 'show' does not return a value and cannot be used in an expression.",
			line: 0,
			start: 26,
			end: 30,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a void call used in a larger expression", () => {
		const source = "func show(){return;}let x=1+show();";
		const result = analyseSource(source);
		const expected = {
			message:
				"Function 'show' does not return a value and cannot be used in an expression.",
			line: 0,
			start: 28,
			end: 32,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a void call used as a return value", () => {
		const source = "func empty(){return;}func outer(){return empty();}";
		const result = analyseSource(source);
		const expected = {
			message:
				"Function 'empty' does not return a value and cannot be used in an expression.",
			line: 0,
			start: 41,
			end: 46,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should analyze an expression returned from a function", () => {
		const source = "func value(){return missing;}";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot find name 'missing'.",
			line: 0,
			start: 20,
			end: 27,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should accept a recursive value-returning call in an expression", () => {
		const source = "func again(){return again();}";
		const result = analyseSource(source);
		assert.strictEqual(result.diagnostics.length, 0);
	});

	test("should report function without returnkind used in expression", () => {
		const source = "func again() {\nlet result = again();\nreturn;\n}";
		const result = analyseSource(source);
		const expected = {
			message: "",
			line: 1,
			start: 27,
			end: 34,
		};
		console.log(result.diagnostics[0]);
		console.log(result.analyzer.visits);
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});
});
