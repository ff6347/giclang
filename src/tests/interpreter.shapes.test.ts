// ABOUTME: Verifies shape commands through the complete GIC source pipeline.
// ABOUTME: Pins exact geometry records for every supported shape built-in.

import assert from "node:assert";
import test, { describe } from "node:test";
import { runSource } from "../core.ts";

describe("interpreter shape commands", () => {
	test("should record a point command", () => {
		const source = "point(12, 34);";
		const actual = runSource(source);

		assert.deepStrictEqual(actual, {
			ok: true,
			commands: [{ type: "point", x: 12, y: 34 }],
			diagnostics: [],
			output: [],
		});
	});

	test("should record a line command", () => {
		const source = "line(10, 20, 30, 40);";
		const actual = runSource(source);

		assert.deepStrictEqual(actual, {
			ok: true,
			commands: [{ type: "line", x1: 10, y1: 20, x2: 30, y2: 40 }],
			diagnostics: [],
			output: [],
		});
	});

	test("should record a rectangle command", () => {
		const source = "rect(10, 20, 30, 40);";
		const actual = runSource(source);

		assert.deepStrictEqual(actual, {
			ok: true,
			commands: [{ type: "rect", x: 10, y: 20, width: 30, height: 40 }],
			diagnostics: [],
			output: [],
		});
	});

	test("should record an ellipse command", () => {
		const source = "ellipse(10, 20, 30, 40);";
		const actual = runSource(source);

		assert.deepStrictEqual(actual, {
			ok: true,
			commands: [{ type: "ellipse", x: 10, y: 20, width: 30, height: 40 }],
			diagnostics: [],
			output: [],
		});
	});

	test("should record a triangle command", () => {
		const source = "triangle(10, 20, 30, 40, 50, 60);";
		const actual = runSource(source);

		assert.deepStrictEqual(actual, {
			ok: true,
			commands: [
				{
					type: "triangle",
					x1: 10,
					y1: 20,
					x2: 30,
					y2: 40,
					x3: 50,
					y3: 60,
				},
			],
			diagnostics: [],
			output: [],
		});
	});

	test("should record a quadrilateral command", () => {
		const source = "quad(10, 20, 30, 40, 50, 60, 70, 80);";
		const actual = runSource(source);

		assert.deepStrictEqual(actual, {
			ok: true,
			commands: [
				{
					type: "quad",
					x1: 10,
					y1: 20,
					x2: 30,
					y2: 40,
					x3: 50,
					y3: 60,
					x4: 70,
					y4: 80,
				},
			],
			diagnostics: [],
			output: [],
		});
	});

	test("should record an arc command with degree angles", () => {
		const source = "arc(50, 50, 20, 0, 90);";
		const actual = runSource(source);

		assert.deepStrictEqual(actual, {
			ok: true,
			commands: [
				{
					type: "arc",
					x: 50,
					y: 50,
					radius: 20,
					startAngle: 0,
					endAngle: 90,
				},
			],
			diagnostics: [],
			output: [],
		});
	});
});
