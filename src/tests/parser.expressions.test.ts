import { describe, test } from "node:test";
import assert from "node:assert";
import { Parser } from "../parser.ts";
import { Lexer } from "../lexer.ts";
import { simplifyProgram } from "./parser-test-helpers.ts";

describe("parser expressions", () => {
	test("should parse a unary expression", () => {
		const lexer = new Lexer("let x = -1;");
		const tokens = lexer.scanTokens();
		const expected = {
			type: "Program",
			statements: [
				{
					type: "VarDecl",
					name: "x",
					initializer: {
						type: "Unary",
						operator: "-",
						right: {
							type: "Literal",
							value: 1,
						},
					},
				},
			],
		};

		const parser = new Parser(tokens);
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});
	test("should parse an expression statement", () => {
		const lexer = new Lexer("1 + 2;");
		const tokens = lexer.scanTokens();
		const expected = {
			type: "Program",
			statements: [
				{
					type: "ExprStmt",
					expression: {
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
				},
			],
		};

		const parser = new Parser(tokens);
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse a call expression", () => {
		const lexer = new Lexer("circle(50, 50);");
		const tokens = lexer.scanTokens();
		const expected = {
			type: "Program",
			statements: [
				{
					type: "ExprStmt",
					expression: {
						type: "Call",
						callee: {
							type: "Identifier",
							name: "circle",
						},
						arguments: [
							{
								type: "Literal",
								value: 50,
							},
							{
								type: "Literal",
								value: 50,
							},
						],
						paren: ")",
					},
				},
			],
		};

		const parser = new Parser(tokens);
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse a call expression in a variable initializer", () => {
		const lexer = new Lexer("let x = pow(2, 8);");
		const tokens = lexer.scanTokens();
		const expected = {
			type: "Program",
			statements: [
				{
					type: "VarDecl",
					name: "x",
					initializer: {
						type: "Call",
						callee: {
							type: "Identifier",
							name: "pow",
						},
						arguments: [
							{
								type: "Literal",
								value: 2,
							},
							{
								type: "Literal",
								value: 8,
							},
						],
						paren: ")",
					},
				},
			],
		};

		const parser = new Parser(tokens);
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse a call with expression arguments", () => {
		const lexer = new Lexer("circle(50, 25 + 25, 10 * 2);");
		const tokens = lexer.scanTokens();
		const expected = {
			type: "Program",
			statements: [
				{
					type: "ExprStmt",
					expression: {
						type: "Call",
						callee: {
							type: "Identifier",
							name: "circle",
						},
						arguments: [
							{
								type: "Literal",
								value: 50,
							},
							{
								type: "Binary",
								operator: "+",
								left: {
									type: "Literal",
									value: 25,
								},
								right: {
									type: "Literal",
									value: 25,
								},
							},
							{
								type: "Binary",
								operator: "*",
								left: {
									type: "Literal",
									value: 10,
								},
								right: {
									type: "Literal",
									value: 2,
								},
							},
						],
						paren: ")",
					},
				},
			],
		};

		const parser = new Parser(tokens);
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse identifier expression statement", () => {
		const lexer = new Lexer("x;");
		const tokens = lexer.scanTokens();
		const expected = {
			type: "Program",
			statements: [
				{
					type: "ExprStmt",
					expression: {
						type: "Identifier",
						name: "x",
					},
				},
			],
		};

		const parser = new Parser(tokens);
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});
});
