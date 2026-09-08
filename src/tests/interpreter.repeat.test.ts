// ABOUTME: Verifies execution of GIC repeat statements through the source pipeline.
// ABOUTME: Starts with positive ranges using the default step and exclusive end.

import assert from "node:assert";
import test, { describe } from "node:test";
import { runSource } from "../core.ts";

describe("interpreter repeat statements", () => {
	test("should execute a positive repeat with the default step", () => {
		const source = `repeat(i, 0, 3) {
	circle(i * 10, 50, 5);
}`;
		const actual = runSource(source);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 0, y: 50, radius: 5 },
			{ type: "circle", x: 10, y: 50, radius: 5 },
			{ type: "circle", x: 20, y: 50, radius: 5 },
		]);
	});

	test("should report a zero repeat step", () => {
		const source = "repeat(i, 3, 0, 0) {}";
		const actual = runSource(source);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Repeat step cannot be zero.",
				line: 0,
				start: 16,
				end: 17,
			},
		]);
	});

	test("should execute a descending repeat with a negative step", () => {
		const source = `repeat(i, 3, 0, -1) {
	circle(i * 10, 50, 5);
}`;
		const actual = runSource(source);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 30, y: 50, radius: 5 },
			{ type: "circle", x: 20, y: 50, radius: 5 },
			{ type: "circle", x: 10, y: 50, radius: 5 },
		]);
	});

	test("should derive fractional values from the iteration count", () => {
		const source = `repeat(t, 0, 1, 0.1) {
	circle(t, 50, 5);
}`;
		const actual = runSource(source);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 0, y: 50, radius: 5 },
			{ type: "circle", x: 0.1, y: 50, radius: 5 },
			{ type: "circle", x: 0.2, y: 50, radius: 5 },
			{ type: "circle", x: 0.30000000000000004, y: 50, radius: 5 },
			{ type: "circle", x: 0.4, y: 50, radius: 5 },
			{ type: "circle", x: 0.5, y: 50, radius: 5 },
			{ type: "circle", x: 0.6000000000000001, y: 50, radius: 5 },
			{ type: "circle", x: 0.7000000000000001, y: 50, radius: 5 },
			{ type: "circle", x: 0.8, y: 50, radius: 5 },
			{ type: "circle", x: 0.9, y: 50, radius: 5 },
		]);
	});

	test("should report a non-number repeat start", () => {
		const source = 'repeat(i, "start", 3) {}';
		const actual = runSource(source);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Expected repeat start value to be a number.",
				line: 0,
				start: 10,
				end: 17,
			},
		]);
	});

	test("should report a non-number repeat end", () => {
		const source = 'repeat(i, 0, "end") {}';
		const actual = runSource(source);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Expected repeat end value to be a number.",
				line: 0,
				start: 13,
				end: 18,
			},
		]);
	});

	test("should report a non-number repeat step", () => {
		const source = 'repeat(i, 0, 3, "step") {}';
		const actual = runSource(source);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Expected repeat step value to be a number.",
				line: 0,
				start: 16,
				end: 22,
			},
		]);
	});
});
