// ABOUTME: Verifies stroke and fill-toggle commands through the GIC source pipeline.
// ABOUTME: Covers numeric and CSS stroke colors plus noStroke and noFill.

import assert from "node:assert";
import test, { describe } from "node:test";
import { runSource } from "../core.ts";

describe("interpreter stroke styles", () => {
	test("should record a numeric OKLCH stroke color", () => {
		const source = "stroke(70, 50, 200);";
		const actual = runSource(source);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{
				type: "stroke",
				color: {
					kind: "oklch",
					lightness: 70,
					chroma: 50,
					hue: 200,
				},
			},
		]);
	});

	test("should record a numeric OKLCH stroke color with alpha", () => {
		const source = "stroke(70, 50, 200, 50);";
		const actual = runSource(source);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{
				type: "stroke",
				color: {
					kind: "oklch",
					lightness: 70,
					chroma: 50,
					hue: 200,
					alpha: 50,
				},
			},
		]);
	});

	test("should record a named CSS stroke color", () => {
		const source = 'stroke("tomato");';
		const actual = runSource(source);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{
				type: "stroke",
				color: { kind: "css", value: "tomato" },
			},
		]);
	});

	test("should record a hexadecimal CSS stroke color", () => {
		const source = 'stroke("#ff6347");';
		const actual = runSource(source);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{
				type: "stroke",
				color: { kind: "css", value: "#ff6347" },
			},
		]);
	});

	test("should record a strokeWidth command", () => {
		const source = "strokeWidth(3);";
		const actual = runSource(source);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [{ type: "strokeWidth", width: 3 }]);
	});

	test("should record a noStroke command", () => {
		const source = "noStroke();";
		const actual = runSource(source);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [{ type: "noStroke" }]);
	});

	test("should record a noFill command", () => {
		const source = "noFill();";
		const actual = runSource(source);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [{ type: "noFill" }]);
	});
});
