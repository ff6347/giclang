// ABOUTME: Verifies lexical environment lookup and nearest-owner assignment.
// ABOUTME: Covers successful parent mutation and missing-name assignment results.

import test, { describe } from "node:test";
import { Environment } from "../environment.ts";
import assert from "node:assert";

describe("Environment", () => {
	test("should assign to the nearest environment that owns the name", () => {
		const parent = new Environment(null);
		const child = new Environment(parent);

		parent.set("outerCount", 1);
		const result = child.assign("outerCount", 2);
		assert.strictEqual(result, true);
		assert.strictEqual(parent.get("outerCount"), 2);
	});

	test("should return false when no environment owns the name", () => {
		const parent = new Environment(null);
		const child = new Environment(parent);

		const result = child.assign("outerCount", 2);
		assert.strictEqual(result, false);
		assert.strictEqual(parent.get("outerCount"), undefined);
	});
});
