import { describe, test } from "node:test";
import assert from "node:assert";
import { Parser } from "../parser.ts";
import { Lexer } from "../lexer.ts";
import { simplifyProgram } from "./parser-test-helpers.ts";

describe("parser precedence", () => {
	test("should parse arithmetic precedence", () => {
		const lexer = new Lexer("let x = 1 + 2 * 3;");
		const tokens = lexer.scanTokens();
		const expected = {
			type: "Program",
			statements: [
				{
					type: "VarDecl",
					name: "x",
					initializer: {
						type: "Binary",
						left: {
							type: "Literal",
							value: 1,
						},
						operator: "+",
						right: {
							type: "Binary",
							left: {
								type: "Literal",
								value: 2,
							},
							operator: "*",
							right: {
								type: "Literal",
								value: 3,
							},
						},
					},
				},
			],
		};

		const parser = new Parser(tokens);
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});
	test("should parse a grouping arithmetic precedence", () => {
		const lexer = new Lexer("let x = (1 + 2) * 3;");
		const tokens = lexer.scanTokens();
		const expected = {
			type: "Program",
			statements: [
				{
					type: "VarDecl",
					name: "x",
					initializer: {
						left: {
							expression: {
								left: {
									type: "Literal",
									value: 1,
								},
								operator: "+",
								right: {
									type: "Literal",
									value: 2,
								},
								type: "Binary",
							},
							type: "Grouping",
						},
						operator: "*",
						right: {
							type: "Literal",
							value: 3,
						},
						type: "Binary",
					},
				},
			],
		};

		const parser = new Parser(tokens);
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse comparison and equality precedence", () => {
		const lexer = new Lexer("let ok = 1 + 2 == 3;");
		const tokens = lexer.scanTokens();
		const expected = {
			type: "Program",
			statements: [
				{
					type: "VarDecl",
					name: "ok",
					initializer: {
						type: "Binary",
						left: {
							type: "Binary",
							left: {
								type: "Literal",
								value: 1,
							},
							operator: "+",
							right: {
								type: "Literal",
								value: 2,
							},
						},
						operator: "==",
						right: {
							type: "Literal",
							value: 3,
						},
					},
				},
			],
		};

		const parser = new Parser(tokens);
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse a logical expression", () => {
		const lexer = new Lexer("let ok = true || false && !done;");
		const tokens = lexer.scanTokens();
		const expected = {
			type: "Program",
			statements: [
				{
					type: "VarDecl",
					name: "ok",
					initializer: {
						type: "Logical",
						left: { type: "Literal", value: true },
						operator: "||",
						right: {
							type: "Logical",
							left: { type: "Literal", value: false },
							operator: "&&",
							right: {
								type: "Unary",
								operator: "!",
								right: {
									type: "Identifier",
									name: "done",
								},
							},
						},
					},
				},
			],
		};

		const parser = new Parser(tokens);
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});
});
