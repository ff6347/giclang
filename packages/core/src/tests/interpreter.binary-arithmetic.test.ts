// ABOUTME: Verifies binary arithmetic over evaluated GIC runtime values.
// ABOUTME: Covers numeric results, string addition, and arithmetic errors.

import assert from "node:assert";
import test, { describe } from "node:test";
import { runSource } from "../core.ts";
import { applyBinaryOperation } from "../operators.ts";
import { Token } from "../tokens.ts";

describe("binary arithmetic", () => {
	test("should add numbers", () => {
		const actual = runSource(`circle(7 + 5, 0, 1);`);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 12, y: 0, radius: 1 },
		]);
	});

	test("should concatenate strings", () => {
		const operator = new Token("PLUS", "+", null, 0, 6, 7);
		const actual = applyBinaryOperation(operator, "gic", "-lang");

		assert.equal(actual, "gic-lang");
	});

	test("should subtract numbers", () => {
		const actual = runSource(`circle(12 - 5, 0, 1);`);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 7, y: 0, radius: 1 },
		]);
	});

	test("should divide numbers", () => {
		const actual = runSource(`circle(7 / 2, 0, 1);`);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 3.5, y: 0, radius: 1 },
		]);
	});

	test("should calculate a remainder", () => {
		const actual = runSource(`circle(7 % 3, 0, 1);`);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 1, y: 0, radius: 1 },
		]);
	});

	test("should reject mixed addition operands", () => {
		const actual = runSource(`let value = 1 + "1";`);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message:
					"Cannot add values unless both are numbers or both are strings.",
				line: 0,
				start: 14,
				end: 15,
			},
		]);
	});

	test("should reject non-number subtraction operands", () => {
		const actual = runSource(`let value = true - 1;`);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Cannot perform subtraction on non-number values.",
				line: 0,
				start: 17,
				end: 18,
			},
		]);
	});

	test("should reject non-number multiplication operands", () => {
		const actual = runSource(`let value = 2 * false;`);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Cannot perform multiplication on non-number values.",
				line: 0,
				start: 14,
				end: 15,
			},
		]);
	});

	test("should reject non-number division operands", () => {
		const actual = runSource(`let value = "8" / 2;`);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Cannot perform division on non-number values.",
				line: 0,
				start: 16,
				end: 17,
			},
		]);
	});

	test("should reject non-number modulo operands", () => {
		const actual = runSource(`let value = 8 % "3";`);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Cannot perform modulo on non-number values.",
				line: 0,
				start: 14,
				end: 15,
			},
		]);
	});

	test("should reject division by zero", () => {
		const actual = runSource(`let value = 7 / 0;`);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Cannot divide by zero.",
				line: 0,
				start: 14,
				end: 15,
			},
		]);
	});

	test("should reject modulo by zero", () => {
		const actual = runSource(`let value = 7 % 0;`);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Cannot calculate modulo by zero.",
				line: 0,
				start: 14,
				end: 15,
			},
		]);
	});
});
