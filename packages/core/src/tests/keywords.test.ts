// ABOUTME: Testing for reserved words
// ABOUTME: Pins the keyword table and the reserved-name derivation against the spec.
import assert from "node:assert";
import test, { describe } from "node:test";
import { reservedNames } from "../keywords.ts";

describe("keywords", () => {
	test("should verify that reservedNames exists and has keywords", () => {
		assert.strictEqual(reservedNames.has("else"), true);
		assert.strictEqual(reservedNames.has("false"), true);
		assert.strictEqual(reservedNames.has("true"), true);
		assert.strictEqual(reservedNames.has("if"), true);
		assert.strictEqual(reservedNames.has("return"), true);
		assert.strictEqual(reservedNames.has("let"), true);
		assert.strictEqual(reservedNames.has("repeat"), true);
		assert.strictEqual(reservedNames.has("func"), true);
		assert.strictEqual(reservedNames.has("loop"), true);
		assert.strictEqual(reservedNames.has("null"), true);

		assert.strictEqual(reservedNames.has("point"), true);
		assert.strictEqual(reservedNames.has("line"), true);
		assert.strictEqual(reservedNames.has("rect"), true);
		assert.strictEqual(reservedNames.has("circle"), true);
		assert.strictEqual(reservedNames.has("ellipse"), true);
		assert.strictEqual(reservedNames.has("triangle"), true);
		assert.strictEqual(reservedNames.has("quad"), true);
		assert.strictEqual(reservedNames.has("arc"), true);
		assert.strictEqual(reservedNames.has("fill"), true);
		assert.strictEqual(reservedNames.has("noFill"), true);
		assert.strictEqual(reservedNames.has("stroke"), true);
		assert.strictEqual(reservedNames.has("noStroke"), true);
		assert.strictEqual(reservedNames.has("strokeWidth"), true);
		assert.strictEqual(reservedNames.has("background"), true);
		assert.strictEqual(reservedNames.has("random"), true);
		assert.strictEqual(reservedNames.has("randomSeed"), true);
		assert.strictEqual(reservedNames.has("floor"), true);
		assert.strictEqual(reservedNames.has("ceil"), true);
		assert.strictEqual(reservedNames.has("round"), true);
		assert.strictEqual(reservedNames.has("abs"), true);
		assert.strictEqual(reservedNames.has("min"), true);
		assert.strictEqual(reservedNames.has("max"), true);
		assert.strictEqual(reservedNames.has("sqrt"), true);
		assert.strictEqual(reservedNames.has("pow"), true);
		assert.strictEqual(reservedNames.has("sin"), true);
		assert.strictEqual(reservedNames.has("cos"), true);
		assert.strictEqual(reservedNames.has("print"), true);
		assert.strictEqual(reservedNames.has("PI"), true);
		assert.strictEqual(reservedNames.has("WIDTH"), true);
		assert.strictEqual(reservedNames.has("HEIGHT"), true);

		assert.strictEqual(reservedNames.has("banana"), false);
	});
});
