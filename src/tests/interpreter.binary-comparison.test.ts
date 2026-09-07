// ABOUTME: Verifies binary comparisons and equality through the GIC source pipeline.
// ABOUTME: Covers numeric comparison and strict equality without coercion.

import assert from "node:assert";
import test, { describe } from "node:test";
import { runSource } from "../core.ts";

describe("binary comparison and equality", () => {
	test("should compare less than", () => {
		const actual = runSource(`if (2 < 3) {
	circle(10, 10, 5);
}`);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 10, y: 10, radius: 5 },
		]);
	});

	test("should return false for a failed less-than comparison", () => {
		const actual = runSource(`if (3 < 2) {
	circle(10, 10, 5);
}`);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, []);
	});

	test("should compare less than or equal", () => {
		const actual = runSource(`if (3 <= 3) {
	circle(10, 10, 5);
}`);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 10, y: 10, radius: 5 },
		]);
	});

	test("should compare greater than or equal", () => {
		const actual = runSource(`if (4 >= 3) {
	circle(10, 10, 5);
}`);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 10, y: 10, radius: 5 },
		]);
	});

	test("should compare equal numbers", () => {
		const actual = runSource(`if (3 == 3) {
	circle(10, 10, 5);
}`);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 10, y: 10, radius: 5 },
		]);
	});

	test("should compare equal booleans", () => {
		const actual = runSource(`if (true == true) {
	circle(10, 10, 5);
}`);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 10, y: 10, radius: 5 },
		]);
	});

	test("should compare unequal strings", () => {
		const actual = runSource(`if ("circle" != "square") {
	circle(10, 10, 5);
}`);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 10, y: 10, radius: 5 },
		]);
	});

	test("should compare cross-type values without coercion", () => {
		const actual = runSource(`if (1 == "1") {
	circle(10, 10, 5);
}`);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, []);
	});

	test("should compare cross-type inequality without coercion", () => {
		const actual = runSource(`if (1 != "1") {
	circle(10, 10, 5);
}`);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 10, y: 10, radius: 5 },
		]);
	});

	test("should reject non-number less-than operands", () => {
		const actual = runSource(`if ("2" < 3) {}`);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Cannot compare non-number values.",
				line: 0,
				start: 8,
				end: 9,
			},
		]);
	});

	test("should reject non-number less-than-or-equal operands", () => {
		const actual = runSource(`if (2 <= "3") {}`);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Cannot compare non-number values.",
				line: 0,
				start: 6,
				end: 8,
			},
		]);
	});

	test("should reject non-number greater-than-or-equal operands", () => {
		const actual = runSource(`if (true >= 3) {}`);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Cannot compare non-number values.",
				line: 0,
				start: 9,
				end: 11,
			},
		]);
	});
});
