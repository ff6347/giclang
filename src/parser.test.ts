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
	if (expression.type === "Unary") {
		return {
			type: expression.type,
			operator: expression.operator.lexeme,
			right: simplifyExpression(expression.right),
		};
	}
	if (expression.type === "Grouping") {
		return {
			type: expression.type,
			expression: simplifyExpression(expression.expression),
		};
	}
	if (expression.type === "Call") {
		return {
			type: expression.type,
			callee: simplifyExpression(expression.callee),
			arguments: expression.arguments.map((argument) =>
				simplifyExpression(argument),
			),
			paren: expression.paren.lexeme,
		};
	}
	if (expression.type === "Logical") {
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

			if (statement.type === "ExprStmt") {
				return {
					type: statement.type,
					expression: simplifyExpression(statement.expression),
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

	test("", () => {
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
	test("", () => {
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
	test("", () => {
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
});
