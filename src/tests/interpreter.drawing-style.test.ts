// ABOUTME: Verifies drawing style commands through the complete GIC source pipeline.
// ABOUTME: Covers ordered style changes followed by shape commands.

import assert from "node:assert";
import test, { describe } from "node:test";
import { runSource } from "../core.ts";

describe("interpreter drawing styles", () => {
	test("should record style and shape commands in source order", () => {
		const source = `fill(70, 50, 200);
noStroke();
circle(50, 50, 10);`;
		const actual = runSource(source);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{
				type: "fill",
				color: {
					kind: "oklch",
					lightness: 70,
					chroma: 50,
					hue: 200,
				},
			},
			{ type: "noStroke" },
			{ type: "circle", x: 50, y: 50, radius: 10 },
		]);
	});

	test("should record background with a tagged OKLCH color", () => {
		const source = "background(20, 30, 40);";
		const actual = runSource(source);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{
				type: "background",
				color: {
					kind: "oklch",
					lightness: 20,
					chroma: 30,
					hue: 40,
				},
			},
		]);
	});

	test("should record background with OKLCH alpha", () => {
		const source = "background(20, 30, 40, 50);";
		const actual = runSource(source);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{
				type: "background",
				color: {
					kind: "oklch",
					lightness: 20,
					chroma: 30,
					hue: 40,
					alpha: 50,
				},
			},
		]);
	});

	test("should accept fill values at their lower bounds", () => {
		const source = "fill(0, 0, 0, 0);";
		const actual = runSource(source);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{
				type: "fill",
				color: {
					kind: "oklch",
					lightness: 0,
					chroma: 0,
					hue: 0,
					alpha: 0,
				},
			},
		]);
	});

	test("should accept fill values at their upper bounds", () => {
		const source = "fill(100, 100, 360, 100);";
		const actual = runSource(source);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{
				type: "fill",
				color: {
					kind: "oklch",
					lightness: 100,
					chroma: 100,
					hue: 360,
					alpha: 100,
				},
			},
		]);
	});

	test("should reject fill lightness below zero", () => {
		const source = "fill(-1, 50, 200);";
		const actual = runSource(source);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message:
					"Function 'fill' requires argument 'lightness' to be between 0 and 100.",
				line: 0,
				start: 0,
				end: 4,
			},
		]);
	});

	test("should reject fill lightness above 100", () => {
		const source = "fill(101, 50, 200);";
		const actual = runSource(source);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message:
					"Function 'fill' requires argument 'lightness' to be between 0 and 100.",
				line: 0,
				start: 0,
				end: 4,
			},
		]);
	});

	test("should reject fill chroma below zero", () => {
		const source = "fill(50, -1, 200);";
		const actual = runSource(source);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message:
					"Function 'fill' requires argument 'chroma' to be between 0 and 100.",
				line: 0,
				start: 0,
				end: 4,
			},
		]);
	});

	test("should reject fill chroma above 100", () => {
		const source = "fill(50, 101, 200);";
		const actual = runSource(source);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message:
					"Function 'fill' requires argument 'chroma' to be between 0 and 100.",
				line: 0,
				start: 0,
				end: 4,
			},
		]);
	});

	test("should reject fill hue below zero", () => {
		const source = "fill(50, 50, -1);";
		const actual = runSource(source);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message:
					"Function 'fill' requires argument 'hue' to be between 0 and 360.",
				line: 0,
				start: 0,
				end: 4,
			},
		]);
	});

	test("should reject fill hue above 360", () => {
		const source = "fill(50, 50, 361);";
		const actual = runSource(source);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message:
					"Function 'fill' requires argument 'hue' to be between 0 and 360.",
				line: 0,
				start: 0,
				end: 4,
			},
		]);
	});

	test("should reject fill alpha below zero", () => {
		const source = "fill(50, 50, 200, -1);";
		const actual = runSource(source);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message:
					"Function 'fill' requires argument 'alpha' to be between 0 and 100.",
				line: 0,
				start: 0,
				end: 4,
			},
		]);
	});

	test("should reject fill alpha above 100", () => {
		const source = "fill(50, 50, 200, 101);";
		const actual = runSource(source);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message:
					"Function 'fill' requires argument 'alpha' to be between 0 and 100.",
				line: 0,
				start: 0,
				end: 4,
			},
		]);
	});
});
