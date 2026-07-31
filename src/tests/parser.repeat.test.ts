// ABOUTME: Tests parsing of GIC repeat statements.
// ABOUTME: Covers valid repeat forms, nesting, and required delimiters.

import test, { describe } from "node:test";
import assert from "node:assert";
import { Lexer } from "../lexer.ts";
import { Parser } from "../parser.ts";
import { simplifyProgram } from "./parser-test-helpers.ts";
import { ParserError } from "../error.ts";

describe("parser repeat statements", () => {
	test("should fail to parse repeat statement with 4 arguments and missing '(' after repeat keyword", () => {
		const lexer = new Lexer(`repeat i, 0, 10, 2)
			}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);

		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				assert.equal(error instanceof ParserError, true);
				assert.match(error.message, /Expected '\(' after 'repeat'./);
				return true;
			},
		);
	});
	test("should fail to parse repeat statement with 3 arguments and missing loop varaible", () => {
		const lexer = new Lexer(`repeat(0, 10, 2) {
			}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);

		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				assert.equal(error instanceof ParserError, true);
				assert.match(error.message, /Expected loop variable name./);
				return true;
			},
		);
	});

	test("should fail to parse repeat statement with 4 arguments and missing loop variable", () => {
		const lexer = new Lexer(`repeat(, 0, 10, 2) {
			}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);

		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				assert.equal(error instanceof ParserError, true);
				assert.match(error.message, /Expected loop variable name./);
				return true;
			},
		);
	});

	test("should fail to parse repeat statement with 4 arguments and missing '{' before repeat block", () => {
		const lexer = new Lexer(`repeat(i, 0, 10, 2)
			}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);

		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				assert.equal(error instanceof ParserError, true);
				assert.match(error.message, /Expected '\{' before body/);
				return true;
			},
		);
	});

	test("should fail to parse repeat statement with 4 arguments and missing ')' after repeat arguments", () => {
		const lexer = new Lexer(`repeat(i, 0, 10, 2 {
			}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);

		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				assert.equal(error instanceof ParserError, true);
				assert.match(error.message, /Expected '\)' after repeat arguments./);
				return true;
			},
		);
	});

	test("should fail to parse repeat statement with 4 arguments and missing ',' after repeat end", () => {
		const lexer = new Lexer(`repeat(i, 0, 10 2) {
			}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);

		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				assert.equal(error instanceof ParserError, true);
				assert.match(error.message, /Expected ',' after repeat end./);
				return true;
			},
		);
	});

	test("should fail to parse repeat statement with 3 arguments and missing ',' after variable", () => {
		const lexer = new Lexer(`repeat(i 0 10){

			}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);

		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				assert.equal(error instanceof ParserError, true);
				assert.match(error.message, /Expected ',' after variable./);
				return true;
			},
		);
	});
	test("should fail to parse repeat statement with 3 arguments and missing ',' after start", () => {
		const lexer = new Lexer(`repeat(i, 0 10){

			}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);

		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				assert.equal(error instanceof ParserError, true);
				assert.match(error.message, /Expected ',' after start./);
				return true;
			},
		);
	});

	test("should parse repeat statement with 3 arguments", () => {
		const lexer = new Lexer(`repeat(i, 0, 10){

			}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "RepeatStmt",
					variable: "i",
					start: {
						type: "Literal",
						value: 0,
					},
					end: {
						type: "Literal",
						value: 10,
					},
					body: [],
				},
			],
		};
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});
	test("should parse repeat statement with 4 arguments and unary expression", () => {
		const lexer = new Lexer(`repeat(i, 10, 0, -1){

			}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "RepeatStmt",
					variable: "i",
					start: {
						type: "Literal",
						value: 10,
					},
					end: {
						type: "Literal",
						value: 0,
					},
					step: {
						operator: "-",
						type: "Unary",
						right: {
							type: "Literal",
							value: 1,
						},
					},
					body: [],
				},
			],
		};
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse repeat statement with 4 arguments", () => {
		const lexer = new Lexer(`repeat(i, 0, 10, 2){

			}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "RepeatStmt",
					variable: "i",
					start: {
						type: "Literal",
						value: 0,
					},
					end: {
						type: "Literal",
						value: 10,
					},
					step: {
						type: "Literal",
						value: 2,
					},
					body: [],
				},
			],
		};
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse repeat statement with 3 arguments and body", () => {
		const lexer = new Lexer(`repeat(i, 0, 10){
			x = i;
			}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "RepeatStmt",
					variable: "i",
					start: {
						type: "Literal",
						value: 0,
					},
					end: {
						type: "Literal",
						value: 10,
					},
					body: [
						{
							type: "Assignment",
							name: "x",
							value: {
								type: "Identifier",
								name: "i",
							},
						},
					],
				},
			],
		};
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});

	test("should parse repeat statement with 3 arguments and nested repeat", () => {
		const lexer = new Lexer(`repeat(i, 0, 10){
			repeat(j, 0, 5){
				}
			}`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "RepeatStmt",
					variable: "i",
					start: {
						type: "Literal",
						value: 0,
					},
					end: {
						type: "Literal",
						value: 10,
					},
					body: [
						{
							type: "RepeatStmt",
							variable: "j",
							start: {
								type: "Literal",
								value: 0,
							},
							end: {
								type: "Literal",
								value: 5,
							},
							body: [],
						},
					],
				},
			],
		};
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});
});
