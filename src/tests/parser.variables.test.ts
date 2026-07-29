import assert from "node:assert";
import { simplifyProgram } from "./parser-test-helpers.ts";
import test, { describe } from "node:test";
import { Lexer } from "../lexer.ts";
import { Parser } from "../parser.ts";

describe("parser variables statements", () => {
	test("should parse a declaration followed by an assignment", () => {
		const lexer = new Lexer(`let x = 5;
x = 10;`);
		const tokens = lexer.scanTokens();
		const expected = {
			type: "Program",
			statements: [
				{
					initializer: {
						type: "Literal",
						value: 5,
					},
					type: "VarDecl",
					name: "x",
				},
				{
					type: "Assignment",
					name: "x",
					value: {
						type: "Literal",
						value: 10,
					},
				},
			],
		};

		const parser = new Parser(tokens);
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse a boolean variable declaration", () => {
		const lexer = new Lexer("let x = true;");
		const tokens = lexer.scanTokens();

		const expected = {
			type: "Program",
			statements: [
				{
					type: "VarDecl",
					name: "x",
					initializer: {
						type: "Literal",
						value: true,
					},
				},
			],
		};

		const parser = new Parser(tokens);
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse a string variable declaration", () => {
		const lexer = new Lexer('let x = "hello";');
		const tokens = lexer.scanTokens();

		const expected = {
			type: "Program",
			statements: [
				{
					type: "VarDecl",
					name: "x",
					initializer: {
						type: "Literal",
						value: "hello",
					},
				},
			],
		};

		const parser = new Parser(tokens);
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse a variable declaration", () => {
		const lexer = new Lexer("let x = 1;");
		const tokens = lexer.scanTokens();

		const expected = {
			type: "Program",
			statements: [
				{
					type: "VarDecl",
					name: "x",
					initializer: {
						type: "Literal",
						value: 1,
					},
				},
			],
		};

		const parser = new Parser(tokens);
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse an identifier declaration", () => {
		const lexer = new Lexer("let x = other;");
		const tokens = lexer.scanTokens();

		const expected = {
			type: "Program",
			statements: [
				{
					type: "VarDecl",
					name: "x",
					initializer: {
						type: "Identifier",
						name: "other",
					},
				},
			],
		};

		const parser = new Parser(tokens);
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse an assignment expression", () => {
		const lexer = new Lexer("x = 5;");
		const tokens = lexer.scanTokens();
		const expected = {
			type: "Program",
			statements: [
				{
					type: "Assignment",
					name: "x",
					value: {
						type: "Literal",
						value: 5,
					},
				},
			],
		};

		const parser = new Parser(tokens);
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse an assignment with expression value", () => {
		const lexer = new Lexer("x = 5 + 5;");
		const tokens = lexer.scanTokens();
		const expected = {
			type: "Program",
			statements: [
				{
					type: "Assignment",
					name: "x",
					value: {
						type: "Binary",
						operator: "+",
						left: {
							type: "Literal",
							value: 5,
						},
						right: {
							type: "Literal",
							value: 5,
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
