// ABOUTME: Tests parsing of GIC conditional statements and branches.
// ABOUTME: Covers valid if forms, nesting, and required delimiters.

import test, { describe } from "node:test";
import assert from "node:assert";
import { Lexer } from "../lexer.ts";
import { Parser } from "../parser.ts";
import { simplifyProgram } from "./parser-test-helpers.ts";

describe("parser if statements", () => {
	test("should retain the if keyword token", () => {
		const tokens = new Lexer("if (true) {}").scanTokens();
		const program = new Parser(tokens).parse();
		const statement = program.statements[0];

		assert.strictEqual(statement?.type, "IfStmt");
		if (statement?.type !== "IfStmt") {
			assert.fail("Expected an IfStmt.");
		}
		assert.deepStrictEqual(
			{
				lexeme: statement.keyword.lexeme,
				line: statement.keyword.line,
				start: statement.keyword.start,
				end: statement.keyword.end,
			},
			{ lexeme: "if", line: 0, start: 0, end: 2 },
		);
	});

	test("should parse if statement", () => {
		const lexer = new Lexer(`
			if (x> 10) {
				x = 1;
			}
		`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "IfStmt",
					condition: {
						type: "Binary",
						operator: ">",
						left: {
							type: "Identifier",
							name: "x",
						},
						right: {
							type: "Literal",
							value: 10,
						},
					},
					thenBranch: [
						{
							type: "Assignment",
							name: "x",
							value: {
								type: "Literal",
								value: 1,
							},
						},
					],
				},
			],
		};
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse if statement with empty block", () => {
		const lexer = new Lexer(`
			if (x > 10) {
			}
		`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "IfStmt",
					condition: {
						type: "Binary",
						left: {
							type: "Identifier",
							name: "x",
						},
						operator: ">",
						right: {
							type: "Literal",
							value: 10,
						},
					},
					thenBranch: [],
				},
			],
		};
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse declarations inside if block", () => {
		const lexer = new Lexer(`
			if (x > 10) {
				let y = 1;
				x = y;
			}
		`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "IfStmt",
					condition: {
						type: "Binary",
						left: {
							type: "Identifier",
							name: "x",
						},
						operator: ">",
						right: {
							type: "Literal",
							value: 10,
						},
					},
					thenBranch: [
						{
							type: "VarDecl",
							name: "y",
							initializer: {
								type: "Literal",
								value: 1,
							},
						},
						{
							type: "Assignment",
							name: "x",
							value: {
								type: "Identifier",
								name: "y",
							},
						},
					],
				},
			],
		};
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse if statement with else branch", () => {
		const lexer = new Lexer(`
			if (x > 10) {
				x = 1;
			} else {
				x = 2;
			}
		`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "IfStmt",
					condition: {
						type: "Binary",
						left: {
							type: "Identifier",
							name: "x",
						},
						operator: ">",
						right: {
							type: "Literal",
							value: 10,
						},
					},
					thenBranch: [
						{
							type: "Assignment",
							name: "x",
							value: {
								type: "Literal",
								value: 1,
							},
						},
					],
					elseBranch: [
						{
							type: "Assignment",
							name: "x",
							value: {
								type: "Literal",
								value: 2,
							},
						},
					],
				},
			],
		};
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse multiple statements inside else branch", () => {
		const lexer = new Lexer(`
			if (x > 10) {
				x = 1;
			} else {
				let y = 2;
				x = y + 1;
			}
		`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "IfStmt",
					condition: {
						type: "Binary",
						left: {
							type: "Identifier",
							name: "x",
						},
						operator: ">",
						right: {
							type: "Literal",
							value: 10,
						},
					},
					thenBranch: [
						{
							type: "Assignment",
							name: "x",
							value: {
								type: "Literal",
								value: 1,
							},
						},
					],
					elseBranch: [
						{
							type: "VarDecl",
							name: "y",
							initializer: {
								type: "Literal",
								value: 2,
							},
						},
						{
							type: "Assignment",
							name: "x",
							value: {
								type: "Binary",
								left: {
									type: "Identifier",
									name: "y",
								},
								operator: "+",
								right: {
									type: "Literal",
									value: 1,
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

	test("should parse else-if chain", () => {
		const lexer = new Lexer(`
			if (x > 10) {
				x = 1;
			} else if (x > 5) {
				x = 2;
			} else {
				x = 3;
			}
		`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "IfStmt",
					condition: {
						type: "Binary",
						left: {
							type: "Identifier",
							name: "x",
						},
						operator: ">",
						right: {
							type: "Literal",
							value: 10,
						},
					},
					thenBranch: [
						{
							type: "Assignment",
							name: "x",
							value: {
								type: "Literal",
								value: 1,
							},
						},
					],
					elseBranch: [
						{
							type: "IfStmt",
							condition: {
								type: "Binary",
								left: {
									type: "Identifier",
									name: "x",
								},
								operator: ">",
								right: {
									type: "Literal",
									value: 5,
								},
							},
							thenBranch: [
								{
									type: "Assignment",
									name: "x",
									value: {
										type: "Literal",
										value: 2,
									},
								},
							],
							elseBranch: [
								{
									type: "Assignment",
									name: "x",
									value: {
										type: "Literal",
										value: 3,
									},
								},
							],
						},
					],
				},
			],
		};
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse nested if statement", () => {
		const lexer = new Lexer(`
			if (x > 10) {
				if (y > 10) {
					x = y;
				}
			}
		`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "IfStmt",
					condition: {
						type: "Binary",
						left: {
							type: "Identifier",
							name: "x",
						},
						operator: ">",
						right: {
							type: "Literal",
							value: 10,
						},
					},
					thenBranch: [
						{
							type: "IfStmt",
							condition: {
								type: "Binary",
								left: {
									type: "Identifier",
									name: "y",
								},
								operator: ">",
								right: {
									type: "Literal",
									value: 10,
								},
							},
							thenBranch: [
								{
									type: "Assignment",
									name: "x",
									value: {
										type: "Identifier",
										name: "y",
									},
								},
							],
						},
					],
				},
			],
		};
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should require braces around if body", () => {
		const lexer = new Lexer("if (x > 10) x = 1;");
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		assert.throws(() => parser.parse(), /Expected '\{' before body/);
	});

	test("should require parentheses around if condition", () => {
		const lexer = new Lexer(`
			if x > 10 {
				x = 1;
			}
		`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		assert.throws(() => parser.parse(), /Expected '\(' after 'if'/);
	});

	test("should require braces around else body", () => {
		const lexer = new Lexer(`
			if (x > 10) {
				x = 1;
			} else x = 2;
		`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		assert.throws(() => parser.parse(), /Expected '\{' before else branch/);
	});

	test("should require closing brace after if body", () => {
		const lexer = new Lexer(`
			if (x > 10) {
				x = 1;
		`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		assert.throws(() => parser.parse(), /Expected '}' after block/);
	});
});
