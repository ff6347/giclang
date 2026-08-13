// ABOUTME: Tests parsing of GIC loop block  statements.
// ABOUTME: Covers valid loop forms .

import test, { describe } from "node:test";
import assert from "node:assert";
import { Lexer } from "../lexer.ts";
import { Parser } from "../parser.ts";
import { simplifyProgram } from "./parser-test-helpers.ts";
import type { ParserError } from "../error.ts";
import { EOF, LET, LOOP, RIGHT_BRACE } from "../tokens.ts";

describe("parser.loop", () => {
	test("Should parse programs without loop", () => {
		const lexer = new Lexer(`let x = 0;`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "VarDecl",
					name: "x",
					initializer: {
						type: "Literal",
						value: 0,
					},
				},
			],
		};
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});
	test("Should parse programs with no setup and an empty loop body", () => {
		const lexer = new Lexer(`loop {}`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [],
			loopStatement: {
				type: "LoopStmt",
				body: [],
			},
		};
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});
	test("Should parse setup statements followed by a loop block", () => {
		const lexer = new Lexer(`let x = 0; loop {}`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "VarDecl",
					name: "x",
					initializer: {
						type: "Literal",
						value: 0,
					},
				},
			],
			loopStatement: {
				type: "LoopStmt",

				body: [],
			},
		};

		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});
	test("Should parse function declarations before the loop block", () => {
		const lexer = new Lexer(`let x = 0;
			func foo() {

			}
			loop {}`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const expected = {
			type: "Program",
			statements: [
				{
					type: "VarDecl",
					name: "x",
					initializer: {
						type: "Literal",
						value: 0,
					},
				},
				{
					type: "FuncStmt",
					name: "foo",
					params: [],
					body: [],
				},
			],
			loopStatement: {
				type: "LoopStmt",
				body: [],
			},
		};
		const actual = simplifyProgram(parser.parse());
		assert.deepStrictEqual(actual, expected);
	});
	test("Should reject top-level statements after the loop block", () => {
		const lexer = new Lexer(`let x = 0;
			loop {}
			let y = 1;`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				assert.strictEqual(error.token?.type, LET);
				return true;
			},
		);
	});
	test("Should reject a second top level loop block", () => {
		const lexer = new Lexer(`let x = 0;
			loop {}
			loop {}`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				assert.match(
					error.message,
					/^Unexpected token 'loop'. Only one loop block is allowed and it must be the last construct./,
				);
				assert.strictEqual(error.token?.type, LOOP);
				return true;
			},
		);
	});
	test("Should reject loop without the required open {", () => {
		const lexer = new Lexer(`loop }`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				assert.match(error.message, /Expected '{' after loop./);
				assert.strictEqual(error.token?.type, RIGHT_BRACE);
				return true;
			},
		);
	});
	test("Should reject loop without the required close }", () => {
		const lexer = new Lexer(`loop {`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				assert.match(error.message, /Expected '}' after block./);
				assert.strictEqual(error.token?.type, EOF);
				return true;
			},
		);
	});
});
