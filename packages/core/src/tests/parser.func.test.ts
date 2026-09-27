// ABOUTME: Tests parsing of GIC user function declaration statements.
// ABOUTME: Covers valid func forms and rejects nested func declaration.

import test, { describe } from "node:test";
import assert from "node:assert";
import { Lexer } from "../lexer.ts";
import { Parser } from "../parser.ts";
import { simplifyProgram } from "./parser-test-helpers.ts";
import { ParserError } from "../error.ts";

describe("parser.func", () => {
	test("should parse function declaration with param and non-return assignment", () => {
		const lexer = new Lexer(`func incr(a){
			counter = counter + a;
			return;
			}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "FuncStmt",
					name: "incr",
					params: ["a"],
					body: [
						{
							name: "counter",
							type: "Assignment",
							value: {
								left: {
									name: "counter",
									type: "Identifier",
								},
								operator: "+",
								right: {
									name: "a",
									type: "Identifier",
								},
								type: "Binary",
							},
						},
						{
							type: "ReturnStmt",
						},
					],
				},
			],
		};
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse function declaration with param and non-return expression", () => {
		const lexer = new Lexer(`func fun(x, y){
			rect(x,y,5,5);
			return;
			}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "FuncStmt",
					name: "fun",
					params: ["x", "y"],
					body: [
						{
							type: "ExprStmt",
							expression: {
								arguments: [
									{
										name: "x",
										type: "Identifier",
									},
									{
										name: "y",
										type: "Identifier",
									},
									{
										type: "Literal",
										value: 5,
									},
									{
										type: "Literal",
										value: 5,
									},
								],
								callee: {
									name: "rect",
									type: "Identifier",
								},
								paren: ")",
								type: "Call",
							},
						},
						{
							type: "ReturnStmt",
						},
					],
				},
			],
		};
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});
	test("should parse function declaration no param", () => {
		const lexer = new Lexer(`func fun(){
			return true;
			}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "FuncStmt",
					name: "fun",
					params: [],
					body: [
						{
							type: "ReturnStmt",
							value: {
								type: "Literal",
								value: true,
							},
						},
					],
				},
			],
		};
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

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

	test("should parse function declaration containing if", () => {
		const lexer = new Lexer(`func compare(a, b){
			if(a > b){
			return a;
			}else{
			return b;
			}
			}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "FuncStmt",
					name: "compare",
					params: ["a", "b"],
					body: [
						{
							condition: {
								left: {
									name: "a",
									type: "Identifier",
								},
								operator: ">",
								right: {
									name: "b",
									type: "Identifier",
								},
								type: "Binary",
							},
							elseBranch: [
								{
									type: "ReturnStmt",
									value: {
										name: "b",
										type: "Identifier",
									},
								},
							],
							thenBranch: [
								{
									type: "ReturnStmt",
									value: {
										name: "a",
										type: "Identifier",
									},
								},
							],
							type: "IfStmt",
						},
					],
				},
			],
		};
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse function declaration containing repeat", () => {
		const lexer = new Lexer(`func fun(a,b){
				repeat(i,a,b){
					val = i + a + b;
				}
				return;
				}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "FuncStmt",
					name: "fun",
					params: ["a", "b"],
					body: [
						{
							body: [
								{
									name: "val",
									type: "Assignment",
									value: {
										left: {
											left: {
												name: "i",
												type: "Identifier",
											},
											operator: "+",
											right: {
												name: "a",
												type: "Identifier",
											},
											type: "Binary",
										},
										operator: "+",
										right: {
											name: "b",
											type: "Identifier",
										},
										type: "Binary",
									},
								},
							],
							end: {
								name: "b",
								type: "Identifier",
							},
							start: {
								name: "a",
								type: "Identifier",
							},
							type: "RepeatStmt",
							variable: "i",
						},
						{
							type: "ReturnStmt",
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
					/Unexpected 'func' or 'loop'. Functions and loops can only be declared at the top level./,
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
					/Unexpected 'func' or 'loop'. Functions and loops can only be declared at the top level./,
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
					/Unexpected 'func' or 'loop'. Functions and loops can only be declared at the top level./,
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
					/Unexpected 'func' or 'loop'. Functions and loops can only be declared at the top level./,
				);
				assert.strictEqual(error.token?.lexeme, "func");
				return true;
			},
		);
	});

	test("should throw on missing ( after function name", () => {
		const lexer = new Lexer(`func fun a,b){}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);

		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				assert.match(error.message, /Expected '\(' after function name./);
				assert.strictEqual(error.token?.lexeme, "a");
				return true;
			},
		);
	});

	test("Should throw on Missing , after parameters since that comes first in  funcStatment", () => {
		const lexer = new Lexer(`func fun (a,b {}`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				assert.match(error.message, /Expected ',' after parameter./);
				assert.strictEqual(error.token?.lexeme, "{");
				return true;
			},
		);
	});
	test("Should throw on Missing { before body", () => {
		const lexer = new Lexer(`func fun (a, b) a + b`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				assert.match(error.message, /Expected '\{' after parameters./);
				assert.strictEqual(error.token?.lexeme, "a");
				return true;
			},
		);
	});
	test("Should throw on Missing } after body", () => {
		const lexer = new Lexer(`func fun (a, b) { a + b;`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				assert.match(error.message, /Expected '\}' after block./);
				return true;
			},
		);
	});
});
