// ABOUTME: Verifies metadata stored in the GIC built-in registry.
// ABOUTME: Protects the shared built-in contract used by later language components.

import test, { describe } from "node:test";
import { builtIns } from "../built-ins.ts";
import assert from "node:assert";

describe("built-ins", () => {
	test("should describe WIDTH, HEIGHT, PI as numeric constant in registry", () => {
		const expected = { kind: "constant", valueKind: "number", value: 100 };
		assert.deepStrictEqual(builtIns["WIDTH"], expected);
		assert.deepStrictEqual(builtIns["HEIGHT"], expected);
		assert.deepStrictEqual(builtIns["PI"], {
			kind: "constant",
			valueKind: "number",
			value: Math.PI,
		});
	});

	test("should describe fill, background, stroke with multiple color signatures in registry", () => {
		const expected = {
			kind: "function",
			signatures: [
				["string"],
				["number", "number", "number"],
				["number", "number", "number", "number"],
			],
			returnKind: "void",
		};
		assert.deepStrictEqual(builtIns["fill"], expected);
		assert.deepStrictEqual(builtIns["background"], expected);
		assert.deepStrictEqual(builtIns["stroke"], expected);
	});

	test("should describe noFill, noStroke with zero parameter signatures in registry", () => {
		const expected = {
			kind: "function",
			signatures: [[]],
			returnKind: "void",
		};
		assert.deepStrictEqual(builtIns["noFill"], expected);
		assert.deepStrictEqual(builtIns["noStroke"], expected);
	});
	test("should describe strokeWidth with single parameter signatures in registry", () => {
		const expected = {
			kind: "function",
			signatures: [["number"]],
			returnKind: "void",
		};
		assert.deepStrictEqual(builtIns["strokeWidth"], expected);
	});
	test("should describe print with single parameter signatures in registry", () => {
		const expected = {
			kind: "function",
			signatures: [["string"], ["number"], ["boolean"]],
			returnKind: "void",
		};
		assert.deepStrictEqual(builtIns["print"], expected);
	});

	test("should describe point signature", () => {
		const expected = {
			kind: "function",
			signatures: [["number", "number"]],
			returnKind: "void",
		};
		assert.deepStrictEqual(builtIns["point"], expected);
	});

	test("should describe line signature", () => {
		const expected = {
			kind: "function",
			signatures: [["number", "number", "number", "number"]],
			returnKind: "void",
		};
		assert.deepStrictEqual(builtIns["line"], expected);
	});

	test("should describe rect signature", () => {
		const expected = {
			kind: "function",
			signatures: [["number", "number", "number", "number"]],
			returnKind: "void",
		};
		assert.deepStrictEqual(builtIns["rect"], expected);
	});

	test("should describe circle in registry and validate metadata fields", () => {
		const expected = {
			kind: "function",
			signatures: [["number", "number", "number"]],
			returnKind: "void",
		};
		const actual = builtIns["circle"];
		assert.deepStrictEqual(actual, expected);
	});

	test("should describe ellipse signature", () => {
		const expected = {
			kind: "function",
			signatures: [["number", "number", "number", "number"]],
			returnKind: "void",
		};
		const actual = builtIns["ellipse"];
		assert.deepStrictEqual(actual, expected);
	});

	test("should describe triangle signature", () => {
		const expected = {
			kind: "function",
			signatures: [
				["number", "number", "number", "number", "number", "number"],
			],
			returnKind: "void",
		};
		const actual = builtIns["triangle"];
		assert.deepStrictEqual(actual, expected);
	});

	test("should describe quad signature", () => {
		const expected = {
			kind: "function",
			signatures: [
				[
					"number",
					"number",
					"number",
					"number",
					"number",
					"number",
					"number",
					"number",
				],
			],
			returnKind: "void",
		};

		const actual = builtIns["quad"];
		assert.deepStrictEqual(actual, expected);
	});

	test("should describe arc signature", () => {
		const expected = {
			kind: "function",
			signatures: [["number", "number", "number", "number", "number"]],
			returnKind: "void",
		};
		const actual = builtIns["arc"];
		assert.deepStrictEqual(actual, expected);
	});

	test("should verify random function signature", () => {
		const expected = {
			kind: "function",
			signatures: [["number", "number"]],
			returnKind: "value",
		};
		const actual = builtIns["random"];
		assert.deepStrictEqual(actual, expected);
	});
	test("should verify randomSeed function signature", () => {
		const expected = {
			kind: "function",
			signatures: [["number"]],
			returnKind: "void",
		};
		const actual = builtIns["randomSeed"];
		assert.deepStrictEqual(actual, expected);
	});
	test("should verify floor function signature", () => {
		const expected = {
			kind: "function",
			signatures: [["number"]],
			returnKind: "value",
		};
		const actual = builtIns["floor"];
		assert.deepStrictEqual(actual, expected);
	});
	test("should verify ceil function signature", () => {
		const expected = {
			kind: "function",
			signatures: [["number"]],
			returnKind: "value",
		};
		const actual = builtIns["ceil"];
		assert.deepStrictEqual(actual, expected);
	});
	test("should verify round function signature", () => {
		const expected = {
			kind: "function",
			signatures: [["number"]],
			returnKind: "value",
		};
		const actual = builtIns["round"];
		assert.deepStrictEqual(actual, expected);
	});
	test("should verify abs function signature", () => {
		const expected = {
			kind: "function",
			signatures: [["number"]],
			returnKind: "value",
		};
		const actual = builtIns["abs"];
		assert.deepStrictEqual(actual, expected);
	});
	test("should verify min function signature", () => {
		const expected = {
			kind: "function",
			signatures: [["number", "number"]],
			returnKind: "value",
		};
		const actual = builtIns["min"];
		assert.deepStrictEqual(actual, expected);
	});
	test("should verify max function signature", () => {
		const expected = {
			kind: "function",
			signatures: [["number", "number"]],
			returnKind: "value",
		};
		const actual = builtIns["max"];
		assert.deepStrictEqual(actual, expected);
	});
	test("should verify sqrt function signature", () => {
		const expected = {
			kind: "function",
			signatures: [["number"]],
			returnKind: "value",
		};
		const actual = builtIns["sqrt"];
		assert.deepStrictEqual(actual, expected);
	});
	test("should verify pow function signature", () => {
		const expected = {
			kind: "function",
			signatures: [["number", "number"]],
			returnKind: "value",
		};
		const actual = builtIns["pow"];
		assert.deepStrictEqual(actual, expected);
	});
	test("should verify sin function signature", () => {
		const expected = {
			kind: "function",
			signatures: [["number"]],
			returnKind: "value",
		};
		const actual = builtIns["sin"];
		assert.deepStrictEqual(actual, expected);
	});
	test("should verify cos function signature", () => {
		const expected = {
			kind: "function",
			signatures: [["number"]],
			returnKind: "value",
		};
		const actual = builtIns["cos"];
		assert.deepStrictEqual(actual, expected);
	});
});
