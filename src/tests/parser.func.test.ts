// ABOUTME: Tests parsing of GIC user function declaration statements.
// ABOUTME: Covers valid func forms and rejects nested func declaration.

import test, { describe } from "node:test";
import assert from "node:assert";
import { Lexer } from "../lexer.ts";
import { Parser } from "../parser.ts";
import { simplifyProgram } from "./parser-test-helpers.ts";
import { ParserError } from "../error.ts";

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

	test("should throw on function declaration within function", () => {
		const lexer = new Lexer(`func multiplyAdd(a, b){
				func add (a, b){
					return a + b;
				}
				return add(a * b, a * b);
				}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);

		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				assert.match(
					error.message,
					/Unexpected 'func'. Functions can only be declared at the top level./,
				);
				assert.strictEqual(error.token?.lexeme, "func");
				return true;
			},
		);
	});

	test("should throw on function declaration within if block", () => {
		const lexer = new Lexer(`if(true){
				func add (a, b){
					return a + b;
				}
				}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);

		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				assert.match(
					error.message,
					/Unexpected 'func'. Functions can only be declared at the top level./,
				);
				assert.strictEqual(error.token?.lexeme, "func");
				return true;
			},
		);
	});

	test("should throw on function declaration within repeat block", () => {
		const lexer = new Lexer(`repeat (i, 0, 10){
				func add (a, b){
					return a + b;
				}
				}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);

		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				assert.match(
					error.message,
					/Unexpected 'func'. Functions can only be declared at the top level./,
				);
				assert.strictEqual(error.token?.lexeme, "func");
				return true;
			},
		);
	});

	test("should throw on function declaration within repeat block after a nested if block", () => {
		const lexer = new Lexer(`repeat (i, 0, 10){
				if(i == 0){
				x = 10;
				}
				func add (a, b){
					return a + b;
				}
				}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);

		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				assert.match(
					error.message,
					/Unexpected 'func'. Functions can only be declared at the top level./,
				);
				assert.strictEqual(error.token?.lexeme, "func");
				return true;
			},
		);
	});
});
