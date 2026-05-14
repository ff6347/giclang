import { describe, test } from "node:test";
import assert from "node:assert";
import { Parser } from "./parser.ts";
import { Lexer } from "./lexer.ts";
import type { Expression, Program } from "./ast.ts";

function simplifyExpression(expression: Expression): unknown {
	if (expression.type === "Identifier") {
		return {
			type: expression.type,
			name: expression.name.lexeme,
		};
	}

	if (expression.type === "Literal") {
		return expression;
	}
	if (expression.type === "Binary") {
		return {
			type: expression.type,
			left: simplifyExpression(expression.left),
			operator: expression.operator.lexeme,
			right: simplifyExpression(expression.right),
		};
	}

	return expression;
}

function simplifyProgram(program: Program) {
	return {
		type: program.type,
		statements: program.statements.map((statement) => {
			if (statement.type === "VarDecl") {
				return {
					type: statement.type,
					name: statement.name.lexeme,
					initializer: simplifyExpression(statement.initializer),
				};
			}

			return statement;
		}),
	};
}

describe("parser", () => {
	test("should parse a identifier declaration", () => {
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
});
