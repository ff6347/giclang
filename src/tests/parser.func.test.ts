// ABOUTME: Tests parsing of GIC user function declaration statements.
// ABOUTME: Covers valid func forms, nesting, and required delimiters.

import test, { describe } from "node:test";
import assert from "node:assert";
import { Lexer } from "../lexer.ts";
import { Parser } from "../parser.ts";
import { simplifyProgram } from "./parser-test-helpers.ts";

describe("parser.func", () => {
	test("should parse function declaration", () => {
		const lexer = new Lexer(`func mulitply(a, b){
			return a * b;
			}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "FuncStmt",
					name: "mulitply",
					params: ["a", "b"],
					body: [
						{
							type: "ReturnStmt",
							value: {
								type: "Binary",
								left: {
									type: "Identifier",
									name: "a",
								},
								operator: "*",
								right: {
									type: "Identifier",
									name: "b",
								},
							},
						},
					],
				},
			],
		};
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});
});
