// ABOUTME: Tests for the Analyser diagnostic harness.
// ABOUTME: Covers the empty-report contract and full-traversal coverage with a counting subclass.
import test, { describe } from "node:test";
import assert from "node:assert";
import { analyseSource } from "./analyse-test-helper.ts";

describe("Analyser", () => {
	test("should call Analyser and not throw", () => {
		const source = "let x = 0;loop{if(x==0){print(x);}}";
		const result = analyseSource(source);
		assert.deepStrictEqual(result.diagnostics, []);
	});

	test("should walk full program with all existing node kinds", () => {
		const source = `// comment
func add(a, b){
	return a + b;
}
let x = 0;
if(x > 0 && !false){
	x = 1;
}else {
	print(x);
}
repeat(i,0,10){
	x = add(i,x);
}
loop{
x = 5 + 3;
x = 2;
x = (5 + 3);
x = true;
x = false;
}
			`;
		const result = analyseSource(source);
		const expected = {
			Assignment: 7,
			Binary: 4,
			Call: 2,
			ExprStmt: 1,
			FuncStmt: 1,
			Grouping: 1,
			Identifier: 8,
			IfStmt: 1,
			Literal: 13,
			Logical: 1,
			LoopStmt: 1,
			RepeatStmt: 1,
			ReturnStmt: 1,
			Unary: 1,
			VarDecl: 1,
		};
		assert.deepStrictEqual(
			Object.fromEntries(result.analyzer.visits),
			expected,
		);
		assert.strictEqual(
			result.analyzer.visits.values().reduce((a, b) => a + b, 0),
			44,
		);
	});

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

	test("should reject assignment to a GIC-defined name", () => {
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

	test("should reject a variable declaration using a GIC-defined nam", () => {
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
});
