// ABOUTME: Tests semantic analysis for variables, assignments, and source order.
// ABOUTME: Covers missing names, redeclarations, initializers, and GIC-defined names.
import test, { describe } from "node:test";
import assert from "node:assert";
import { analyseSource } from "./analyse-test-helper.ts";

describe("Analyser variables", () => {
	test("should report undeclared variable ghost", () => {
		const source = "ghost = 1;";
		const expected = {
			message: "Cannot find name 'ghost'.",
			line: 0,
			start: 0,
			end: 5,
		};
		const result = analyseSource(source);
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should not report anything for declared and reassigned variable", () => {
		const source = "let value = 1;value=2;";
		const result = analyseSource(source);

		assert.strictEqual(result.diagnostics.length, 0);
	});

	test("should report redeclared variable", () => {
		const source = "let shade = 0;\nlet shade = 1;";
		const expected = {
			message: "Cannot declare 'shade' because that name already exists.",
			line: 1,
			start: 19,
			end: 24,
		};
		const result = analyseSource(source);
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a name used in its own initializer", () => {
		const source = "let count = count;";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot find name 'count'.",
			line: 0,
			start: 12,
			end: 17,
		};

		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a variable declaration using a GIC-defined name", () => {
		const source = "let PI = 3;";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot declare 'PI' because that name is defined by GIC.",
			line: 0,
			start: 4,
			end: 6,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report assignment to a GIC-defined name", () => {
		const source = "PI = 3;";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot assign to 'PI' because that name is defined by GIC.",
			line: 0,
			start: 0,
			end: 2,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a variable read before its global declaration", () => {
		const source = "print(x);let x=1;";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot find name 'x'.",
			line: 0,
			start: 6,
			end: 7,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});
	test("should report an assignment before its global declaration", () => {
		const source = "x = 2;let x = 1;";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot find name 'x'.",
			line: 0,
			start: 0,
			end: 1,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});
});
