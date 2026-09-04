import test, { describe } from "node:test";
import { runSource } from "../core.ts";
import assert from "node:assert";

describe("slice 2: computed static drawing acceptance", () => {
	test("should compute shape properties with variable", () => {
		const source = `let size = 10;
circle(50, 50, size);
`;
		const actual = runSource(source);
		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 50, y: 50, radius: 10 },
		]);
	});

	test("should compute background properties with variable", () => {
		const source = `let tone = 10;
background(tone, 50, 50);
`;
		const actual = runSource(source);
		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "background", lightness: 10, chroma: 50, hue: 50 },
		]);
	});

	test("should compute binary value after assignment properties with variable for background", () => {
		const source = `let tone = 10;
tone = tone * 3;
background(tone, 50, 50);
`;
		const actual = runSource(source);
		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "background", lightness: 30, chroma: 50, hue: 50 },
		]);
	});

	test("should compute binary value  properties with variable for background", () => {
		const source = `let tone = 10 * 3;
background(tone, 50, 50);
`;
		const actual = runSource(source);
		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "background", lightness: 30, chroma: 50, hue: 50 },
		]);
	});
	test("should compute shape properties through variables, assignment, arithmetic, and an if branch", () => {
		const source = `background(20, 0, 0);
let size = 10;
size = size * 3;
if (size > 20) {
	circle(50, 50, size);
}`;
		const actual = runSource(source);
		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "background", lightness: 20, chroma: 0, hue: 0 },
			{ type: "circle", x: 50, y: 50, radius: 30 },
		]);
	});
});
