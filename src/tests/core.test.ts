import test, { describe } from "node:test";
import { parseSource } from "../core.ts";
import assert from "node:assert";
import type { Program } from "../core.ts";

describe("core.parseSource", () => {
	test("should return ok true and diagnostics array and existing program", () => {
		const actual = parseSource("let x = 0;");
		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.strictEqual(actual.program.type, "Program");
	});

	test("should return ok false and diagnostics array with a diagnostic object and no program", () => {
		const actual = parseSource("let x = 0");
		assert.strictEqual(actual.ok, false);
		assert.strictEqual(Array.isArray(actual.diagnostics), true);
		assert.strictEqual(actual.diagnostics.length > 0, true);
		assert.strictEqual(actual.diagnostics[0] !== undefined, true);
		assert.strictEqual(Object.hasOwn(actual.diagnostics[0]!, "message"), true);
		assert.strictEqual(Object.hasOwn(actual.diagnostics[0]!, "line"), true);
		assert.strictEqual(Object.hasOwn(actual.diagnostics[0]!, "start"), true);
		assert.strictEqual(Object.hasOwn(actual.diagnostics[0]!, "end"), true);
		assert.strictEqual(
			actual.diagnostics[0]!.message,
			"Expected semicolon after variable declaration.",
		);
		assert.strictEqual(actual.diagnostics[0]!.line, 0);
		assert.strictEqual(actual.diagnostics[0]!.start, 9);
		assert.strictEqual(actual.diagnostics[0]!.end, 9);
	});

	test("should expose `Program` through core api", () => {
		const result = parseSource("let x = 0;");
		assert.strictEqual(result.ok, true);
		const program: Program = result.program;
		assert.strictEqual(program.type, "Program");
	});
});
