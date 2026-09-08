// ABOUTME: Tests semantic scope and declaration rules for repeat variables.
// ABOUTME: Covers loop-body visibility, lifetime, conflicts, and enclosing declarations.
import test, { describe } from "node:test";
import assert from "node:assert";
import { analyseSource } from "./analyse-test-helper.ts";

describe("Analyser repeat scopes", () => {
	test("should make a repeat variable visible inside its body", () => {
		const source = "repeat(i,0,3){print(i);}";
		const result = analyseSource(source);

		assert.strictEqual(result.diagnostics.length, 0);
	});

	test("should report a repeat variable used after its loop", () => {
		const source = "repeat(i,0,3){print(i);}\ni=1;";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot find name 'i'.",
			line: 1,
			start: 25,
			end: 26,
		};

		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a repeat variable using a GIC-defined name", () => {
		const source = "repeat(PI,0,10,2){}";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot declare 'PI' because that name is defined by GIC.",
			line: 0,
			start: 7,
			end: 9,
		};

		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a repeat variable referenced in its range expressions", () => {
		const source = "repeat(i,i,3){}";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot find name 'i'.",
			line: 0,
			start: 9,
			end: 10,
		};

		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a repeat variable referenced as its end value", () => {
		const source = "repeat(i,0,i){}";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot find name 'i'.",
			line: 0,
			start: 11,
			end: 12,
		};

		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a repeat variable referenced as its step value", () => {
		const source = "repeat(i,0,3,i){}";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot find name 'i'.",
			line: 0,
			start: 13,
			end: 14,
		};

		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should allow repeat range expressions to use outer names", () => {
		const source = `let start = 0;
let end = 3;
let step = 1;
repeat(i, start, end, step) { print(i); }`;
		const result = analyseSource(source);

		assert.strictEqual(result.diagnostics.length, 0);
	});

	test("should report a repeat variable that reuses a visible function-local name", () => {
		const source = "func enclosing(){\nlet i = 0;\nrepeat(i,0,3){}return;}";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot declare 'i' because that name already exists.",
			line: 2,
			start: 36,
			end: 37,
		};

		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a repeat variable that conflicts with a later global name", () => {
		const source = "repeat(i, 0, 3){}\nlet i=1;";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot declare 'i' because that name already exists.",
			line: 0,
			start: 7,
			end: 8,
		};

		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should allow the same repeat variable name in separate loops", () => {
		const source = "repeat(i, 0, 3){}\nrepeat(i, 0, 3){}";
		const result = analyseSource(source);

		assert.strictEqual(result.diagnostics.length, 0);
	});

	test("should allow distinct variables in nested repeats", () => {
		const source =
			"repeat(row,0,2){repeat(column,0,2){print(row);print(column);}}";
		const result = analyseSource(source);

		assert.strictEqual(result.diagnostics.length, 0);
	});

	test("should report a nested repeat that reuses an outer repeat variable", () => {
		const source = "repeat(i,0,2){repeat(i,0,2){}}";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot declare 'i' because that name already exists.",
			line: 0,
			start: 21,
			end: 22,
		};

		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a variable in a repeat body that reuses the repeat variable", () => {
		const source = "repeat(i, 0, 3){let i = 0;}";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot declare 'i' because that name already exists.",
			line: 0,
			start: 20,
			end: 21,
		};

		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a variable declared in a repeat body after the loop", () => {
		const source = "repeat(i,0,3){let total=0;}\ntotal=1;";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot find name 'total'.",
			line: 1,
			start: 28,
			end: 33,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report assignment to a repeat variable", () => {
		const source = "repeat(i,0,3){i=2;}";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot assign to repeat variable 'i'.",
			line: 0,
			start: 14,
			end: 15,
		};

		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});
});
