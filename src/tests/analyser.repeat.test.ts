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

	test.todo("should report a repeat variable using a GIC-defined name");
	test.todo(
		"should report a repeat variable referenced in its range expressions",
	);
	test.todo(
		"should report a repeat variable that reuses a visible function-local name",
	);
	test.todo(
		"should report a repeat variable that conflicts with a later global name",
	);
	test.todo("should allow the same repeat variable name in separate loops");
	test.todo(
		"should report a variable in a repeat body that reuses the repeat variable",
	);
	test.todo(
		"should keep a variable declared in a repeat body in the enclosing scope",
	);
});
