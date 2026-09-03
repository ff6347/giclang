// ABOUTME: Verifies built-in calls through the source-to-command pipeline.
// ABOUTME: Pins deterministic render commands produced from GIC programs.
import assert from "node:assert";
import { runSource } from "../core.ts";
import test, { describe } from "node:test";

describe("built-in functions", () => {
	test("should return list of commands", () => {
		const source = "background(20, 0, 0);";
		const actual = runSource(source);
		const expected = {
			ok: true,
			commands: [{ type: "background", lightness: 20, chroma: 0, hue: 0 }],
			diagnostics: [],
		};
		assert.deepStrictEqual(actual, expected);
	});

	test("should return list of commands containing two commands", () => {
		const source = "background(20, 0, 0);\nbackground(80, 0, 0);";
		const actual = runSource(source);
		const expected = {
			ok: true,
			commands: [
				{ type: "background", lightness: 20, chroma: 0, hue: 0 },
				{ type: "background", lightness: 80, chroma: 0, hue: 0 },
			],
			diagnostics: [],
		};
		assert.deepStrictEqual(actual, expected);
	});

	test("should return analyzer diagnostics and no commands", () => {
		const source = "PI();";
		const actual = runSource(source);
		const expected = {
			ok: false,
			diagnostics: [
				{
					message: "Cannot call 'PI' because it is not a function.",
					line: 0,
					start: 0,
					end: 2,
				},
			],
		};
		assert.deepStrictEqual(actual, expected);
	});

	test("should return background and circle commands in source order", () => {
		const source = "background(20, 0,0);\ncircle(50,50,30);";
		const actual = runSource(source);
		const expected = {
			ok: true,
			commands: [
				{ type: "background", lightness: 20, chroma: 0, hue: 0 },
				{ type: "circle", x: 50, y: 50, radius: 30 },
			],
			diagnostics: [],
		};
		assert.deepStrictEqual(actual, expected);
	});

	test("should reject invalid circle arity", () => {
		const source = "circle(50, 50);";
		const actual = runSource(source);
		const expected = {
			ok: false,
			diagnostics: [
				{
					message: "Function 'circle' expects 3 arguments, but got 2.",
					line: 0,
					start: 0,
					end: 6,
				},
			],
		};
		assert.deepStrictEqual(actual, expected);
	});

	test("should reject invalid background arity", () => {
		const source = "background(50, 50);";
		const actual = runSource(source);
		const expected = {
			ok: false,
			diagnostics: [
				{
					message:
						"Function 'background' expects 1, 3, or 4 arguments, but got 2.",
					line: 0,
					start: 0,
					end: 10,
				},
			],
		};
		assert.deepStrictEqual(actual, expected);
	});
});
