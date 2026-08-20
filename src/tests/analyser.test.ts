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

	test("should report a function-local name used at global scope", () => {
		const source = "func make(){let inside=1;return;}\ninside=2;";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot find name 'inside'.",
			line: 1,
			start: 34,
			end: 40,
		};

		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should allow a function to read a global variable", () => {
		const source = "let outside = 1;\nfunc read(){\nprint(outside);\nreturn;}";
		const result = analyseSource(source);
		assert.strictEqual(result.diagnostics.length, 0);
	});

	test("should allow a function to assign to a global variable", () => {
		const source = "let level = 1;\nfunc update(){\nlevel = 2;\nreturn;\n}";
		const result = analyseSource(source);
		assert.strictEqual(result.diagnostics.length, 0);
	});

	test("should make a function parameter visible inside its body", () => {
		const source = "func echo(value){\nprint(value);\nreturn;\n}";
		const result = analyseSource(source);
		assert.strictEqual(result.diagnostics.length, 0);
	});

	test("should report a function parameter used at global scope", () => {
		const source = "func echo(value){\nreturn;\n}\nvalue = 1;";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot find name 'value'.",
			line: 3,
			start: 28,
			end: 33,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should find a function name after its declaration", () => {
		const source = "func greet(){return;}\ngreet();";
		const result = analyseSource(source);
		assert.strictEqual(result.diagnostics.length, 0);
	});

	test("should report a function call before its declaration", () => {
		const source = "greet();\nfunc greet(){}";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot find name 'greet'.",
			line: 0,
			start: 0,
			end: 5,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should allow a function to call itself", () => {
		const source = "func again(){again();return;}";
		const result = analyseSource(source);
		assert.strictEqual(result.diagnostics.length, 0);
	});

	test("should report a duplicate function declaration", () => {
		const source = "func paint(){return;}\nfunc paint(){return;}";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot declare 'paint' because that name already exists.",
			line: 1,
			start: 27,
			end: 32,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a function name that conflicts with a global variable", () => {
		const source = "let paint = 1;\nfunc paint(){return;}";
		const expected = {
			message: "Cannot declare 'paint' because that name already exists.",
			line: 1,
			start: 20,
			end: 25,
		};
		const result = analyseSource(source);
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report duplicate parameter names", () => {
		const source = "func blend(value,value){return;}";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot declare 'value' because that name already exists.",
			line: 0,
			start: 17,
			end: 22,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a parameter that reuses a visible global name", () => {
		const source = "let size = 1;\nfunc scale(size){return;}";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot declare 'size' because that name already exists.",
			line: 1,
			start: 25,
			end: 29,
		};

		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a function-local variable that reuses a global name", () => {
		const source = "let size=1;\nfunc adjust(){let size=2;return;}";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot declare 'size' because that name already exists.",
			line: 1,
			start: 30,
			end: 34,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a local variable that conflicts with a later global", () => {
		const source = "func make(){let size=1;return;}\nlet size=2;";
		const result = analyseSource(source);

		const expected = {
			message: "Cannot declare 'size' because that name already exists.",
			line: 0,
			start: 16,
			end: 20,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a parameter that conflicts with a later global", () => {
		const source = "func scale(size){return;}\nlet size = 1;";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot declare 'size' because that name already exists.",
			line: 0,
			start: 11,
			end: 15,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});
});
