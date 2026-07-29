import { describe, test } from "node:test";
import assert from "node:assert";
import { Parser } from "../parser.ts";
import { Lexer } from "../lexer.ts";
import { simplifyProgram } from "./parser-test-helpers.ts";




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

	test("should parse a assignment with expression value", () => {
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
