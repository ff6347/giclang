// ABOUTME: Verifies logical expressions through the complete GIC source pipeline.
// ABOUTME: Covers boolean results, short-circuiting, and operand diagnostics.

import assert from "node:assert";
import test, { describe } from "node:test";
import { runSource } from "../core.ts";

describe("logical expressions", () => {
	test("should return true when both AND operands are true", () => {
		const actual = runSource(`if (true && true) {
	circle(10, 10, 5);
}`);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 10, y: 10, radius: 5 },
		]);
	});

	test("should return false when the right AND operand is false", () => {
		const actual = runSource(`if (true && false) {
	circle(10, 10, 5);
}`);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, []);
	});

	test("should return true when the right OR operand is true", () => {
		const actual = runSource(`if (false || true) {
	circle(10, 10, 5);
}`);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 10, y: 10, radius: 5 },
		]);
	});

	test("should return false when both OR operands are false", () => {
		const actual = runSource(`if (false || false) {
	circle(10, 10, 5);
}`);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, []);
	});

	test("should skip the right operand when the left AND operand is false", () => {
		const actual = runSource(`if (false && (1 > "invalid")) {
	circle(10, 10, 5);
}`);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, []);
	});

	test("should skip the right operand when the left OR operand is true", () => {
		const actual = runSource(`if (true || (1 > "invalid")) {
	circle(10, 10, 5);
}`);

		assert.strictEqual(actual.ok, true);
		assert.deepEqual(actual.diagnostics, []);
		assert.deepEqual(actual.commands, [
			{ type: "circle", x: 10, y: 10, radius: 5 },
		]);
	});

	test("should evaluate the right operand when the left AND operand is true", () => {
		const actual = runSource(`if (true && (1 > "invalid")) {}`);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Cannot compare non-number values.",
				line: 0,
				start: 15,
				end: 16,
			},
		]);
	});

	test("should evaluate the right operand when the left OR operand is false", () => {
		const actual = runSource(`if (false || (1 > "invalid")) {}`);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Cannot compare non-number values.",
				line: 0,
				start: 16,
				end: 17,
			},
		]);
	});

	test("should reject a non-boolean left AND operand", () => {
		const actual = runSource(`if (1 && true) {}`);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Logical operator '&&' requires boolean operands.",
				line: 0,
				start: 6,
				end: 8,
			},
		]);
	});

	test("should reject a non-boolean right AND operand", () => {
		const actual = runSource(`if (true && 1) {}`);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Logical operator '&&' requires boolean operands.",
				line: 0,
				start: 9,
				end: 11,
			},
		]);
	});

	test("should reject a non-boolean left OR operand", () => {
		const actual = runSource(`if (1 || false) {}`);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Logical operator '||' requires boolean operands.",
				line: 0,
				start: 6,
				end: 8,
			},
		]);
	});

	test("should reject a non-boolean right OR operand", () => {
		const actual = runSource(`if (false || 1) {}`);

		assert.strictEqual(actual.ok, false);
		assert.deepEqual(actual.diagnostics, [
			{
				message: "Logical operator '||' requires boolean operands.",
				line: 0,
				start: 10,
				end: 12,
			},
		]);
	});
});
