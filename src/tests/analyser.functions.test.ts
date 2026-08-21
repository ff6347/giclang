// ABOUTME: Tests semantic analysis for function names, parameters, and local scope.
// ABOUTME: Covers source order, recursion, global conflicts, and function assignments.
import test, { describe } from "node:test";
import assert from "node:assert";
import { analyseSource } from "./analyse-test-helper.ts";

describe("Analyser functions", () => {
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

	test("should report a call to an undefined name", () => {
		const source = "missing();";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot find name 'missing'.",
			line: 0,
			start: 0,
			end: 7,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a call to a variable", () => {
		const source = "let item=1;item();";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot call 'item' because it is not a function.",
			line: 0,
			start: 11,
			end: 15,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a call to a built-in constant", () => {
		const source = "PI();";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot call 'PI' because it is not a function.",
			line: 0,
			start: 0,
			end: 2,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should accept a call to a built-in function", () => {
		const source = "print(1);";
		const result = analyseSource(source);
		assert.strictEqual(result.diagnostics.length, 0);
	});

	test("should accept the correct number of user-function arguments", () => {
		const source = "func blend(a,b){return;}blend(1,2);";
		const result = analyseSource(source);
		assert.strictEqual(result.diagnostics.length, 0);
	});

	test("should report too few arguments to a user function", () => {
		const source = "func blend(a,b){return;}blend(1);";
		const result = analyseSource(source);
		const expected = {
			message: "Function 'blend' expects 2 arguments, but got 1.",
			line: 0,
			start: 24,
			end: 29,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report too many arguments to a user function", () => {
		const source = "func blend(a,b){return;}blend(1,2,3);";
		const result = analyseSource(source);
		const expected = {
			message: "Function 'blend' expects 2 arguments, but got 3.",
			line: 0,
			start: 24,
			end: 29,
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

	test("should report a function using a GIC-defined name", () => {
		const source = "func print(){return;}";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot declare 'print' because that name is defined by GIC.",
			line: 0,
			start: 5,
			end: 10,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a parameter using a GIC-defined name", () => {
		const source = "func show(PI){return;}";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot declare 'PI' because that name is defined by GIC.",
			line: 0,
			start: 10,
			end: 12,
		};

		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a function-local variable that reuses a parameter name", () => {
		const source = "func f(x){let x=1;return;}";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot declare 'x' because that name already exists.",
			line: 0,
			start: 14,
			end: 15,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});
	test("should allow the same local variable name in separate functions", () => {
		const source =
			"func first(){let x=1;return;}func second(){let x=2;return;}";
		const result = analyseSource(source);
		assert.strictEqual(result.diagnostics.length, 0);
	});
	test("should report a global variable that conflicts with an earlier function", () => {
		const source = "func f(){return;}let f=2;";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot declare 'f' because that name already exists.",
			line: 0,
			start: 21,
			end: 22,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});
	test("should report a local name that conflicts with a later global function", () => {
		const source = "if(true){let f=1;}func f(){return;}";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot declare 'f' because that name already exists.",
			line: 0,
			start: 13,
			end: 14,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});
	test("should report assignment to a user-defined function", () => {
		const source = "func f(){return;}f=2;";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot assign to function 'f'.",
			line: 0,
			start: 17,
			end: 18,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});
});
