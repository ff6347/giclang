// ABOUTME: Tests parsing of GIC repeat statements.
// ABOUTME: Covers valid repeat forms, nesting, and required delimiters.

import test, { describe } from "node:test";
import assert from "node:assert";
import { Lexer } from "../lexer.ts";
import { Parser } from "../parser.ts";
import { simplifyProgram } from "./parser-test-helpers.ts";

describe("parser repeat statements", () => {
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
