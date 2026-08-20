// ABOUTME: Tests lexical block scope in analyzer control-flow bodies.
// ABOUTME: Covers declaration lifetime, nested visibility, sibling reuse, and shadowing.
import test, { describe } from "node:test";
import { analyseSource } from "./analyse-test-helper.ts";
import assert from "node:assert";

describe("Analyser blocks", () => {
	test("should report a top-level if declaration used after its block", () => {
		const source = "if(true){let x = 0;}x=2;";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot find name 'x'.",
			line: 0,
			start: 20,
			end: 21,
		};

		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});
	test("should report a function-local if declaration used after its block", () => {
		const source = "func f(){if(true){let x=0;}x=2;return;}";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot find name 'x'.",
			line: 0,
			start: 27,
			end: 28,
		};

		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});
	test("should allow a nested block to read an enclosing declaration", () => {
		const source = "if(true){let x=0;if(true){print(x);}}";
		const result = analyseSource(source);
		assert.strictEqual(result.diagnostics.length, 0);
	});
	test("should allow sibling blocks to reuse a local name", () => {
		const source = "if(true){let x=0;}else{let x=1;}x=2;";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot find name 'x'.",
			line: 0,
			start: 32,
			end: 33,
		};

		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report a loop declaration that shadows a visible global", () => {
		const source = "let x=0;loop {let x=1;}";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot declare 'x' because that name already exists.",
			line: 0,
			start: 18,
			end: 19,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should report an if declaration that shadows a visible global", () => {
		const source = "let x=0;if(true){let x=1;}";
		const expected = {
			message: "Cannot declare 'x' because that name already exists.",
			line: 0,
			start: 21,
			end: 22,
		};
		const result = analyseSource(source);
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});

	test("should keep an else declaration visible only inside its block", () => {
		const source = "if(true){let x=0;}else{let x=1;print(x);}x=2;";
		const result = analyseSource(source);
		const expected = {
			message: "Cannot find name 'x'.",
			line: 0,
			start: 41,
			end: 42,
		};
		assert.strictEqual(result.diagnostics.length, 1);
		assert.deepStrictEqual(result.diagnostics[0], expected);
	});
});
