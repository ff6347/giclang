// ABOUTME: Tests the Analyser diagnostic harness and complete AST traversal.
// ABOUTME: Verifies the empty-report contract and visits for every existing node kind.
import test, { describe } from "node:test";
import assert from "node:assert";
import { analyseSource } from "./analyse-test-helper.ts";

describe("Analyser traversal", () => {
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
});
