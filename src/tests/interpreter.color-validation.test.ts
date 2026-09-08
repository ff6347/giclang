// ABOUTME: Verifies CSS color validation through the complete GIC source pipeline.
// ABOUTME: Covers named colors, supported hexadecimal forms, and invalid strings.

import assert from "node:assert";
import test, { describe } from "node:test";
import { runSource } from "../core.ts";

describe("interpreter CSS color validation", () => {
	test("should accept named CSS colors without case sensitivity", () => {
		const source = 'fill("Tomato");';
		const actual = runSource(source);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{
				type: "fill",
				color: { kind: "css", value: "Tomato" },
			},
		]);
	});

	test("should accept the rebeccapurple CSS color", () => {
		const source = 'fill("rebeccapurple");';
		const actual = runSource(source);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{
				type: "fill",
				color: { kind: "css", value: "rebeccapurple" },
			},
		]);
	});

	test("should accept three-digit hexadecimal colors", () => {
		const source = 'fill("#f63");';
		const actual = runSource(source);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{
				type: "fill",
				color: { kind: "css", value: "#f63" },
			},
		]);
	});

	test("should accept four-digit hexadecimal colors with alpha", () => {
		const source = 'fill("#f638");';
		const actual = runSource(source);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{
				type: "fill",
				color: { kind: "css", value: "#f638" },
			},
		]);
	});

	test("should accept eight-digit hexadecimal colors with alpha", () => {
		const source = 'fill("#ff634780");';
		const actual = runSource(source);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{
				type: "fill",
				color: { kind: "css", value: "#ff634780" },
			},
		]);
	});

	test("should reject an unknown named color", () => {
		const source = 'fill("tmoato");';
		const actual = runSource(source);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Invalid color: tmoato",
				line: 0,
				start: 0,
				end: 4,
			},
		]);
	});

	test("should reject non-hexadecimal characters in a hexadecimal color", () => {
		const source = 'fill("#ff63xz");';
		const actual = runSource(source);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Invalid color: #ff63xz",
				line: 0,
				start: 0,
				end: 4,
			},
		]);
	});

	test("should reject an unsupported hexadecimal color length", () => {
		const source = 'fill("#ff634");';
		const actual = runSource(source);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Invalid color: #ff634",
				line: 0,
				start: 0,
				end: 4,
			},
		]);
	});
});
