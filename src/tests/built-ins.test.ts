// ABOUTME: Verifies metadata stored in the GIC built-in registry.
// ABOUTME: Protects the shared built-in contract used by later language components.

import test, { describe } from "node:test";
import { builtIns } from "../built-ins.ts";
import assert from "node:assert";

describe("built-ins", () => {
	test("should describe circle in registry and validate metadata fields", () => {
		const expected = {
			kind: "function",
			signatures: [["number", "number", "number"]],
			returnKind: "void",
		};
		const actual = builtIns["circle"];
		assert.deepStrictEqual(actual, expected);
	});

	test("should describe PI as numeric constant in registry", () => {
		const expected = { kind: "constant", valueKind: "number" };
		const actual = builtIns["PI"];
		assert.deepStrictEqual(actual, expected);
	});

	test("should describe fill with multiple signatures in registry", () => {
		const expected = {
			kind: "function",
			signatures: [
				["string"],
				["number", "number", "number"],
				["number", "number", "number", "number"],
			],
			returnKind: "void",
		};
		const actual = builtIns["fill"];
		assert.deepStrictEqual(actual, expected);
	});
});
