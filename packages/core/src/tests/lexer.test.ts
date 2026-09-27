// ABOUTME: Tests lexical analysis of GIC source into tokens.
// ABOUTME: Covers valid tokens, ignored comments, and lexer errors.

import assert from "node:assert";
import { describe, test } from "node:test";
import { Lexer } from "../lexer.ts";

function scan(source: string) {
	return new Lexer(source).scanTokens().map((token) => ({
		type: token.type,
		lexeme: token.lexeme,
		literal: token.literal,
		line: token.line,
	}));
}

describe("Lexer", () => {
	test("tokenizes a variable declaration", () => {
		assert.deepStrictEqual(scan("let foo = 1;"), [
			{ type: "LET", lexeme: "let", literal: null, line: 0 },
			{ type: "IDENTIFIER", lexeme: "foo", literal: null, line: 0 },
			{ type: "EQUAL", lexeme: "=", literal: null, line: 0 },
			{ type: "NUMBER", lexeme: "1", literal: 1, line: 0 },
			{ type: "SEMICOLON", lexeme: ";", literal: null, line: 0 },
			{ type: "EOF", lexeme: "", literal: null, line: 0 },
		]);
	});

	test("tokenizes keywords and identifiers", () => {
		assert.deepStrictEqual(
			scan("true false trueValue falseValue let repeat func loop null"),
			[
				{ type: "TRUE", lexeme: "true", literal: true, line: 0 },
				{ type: "FALSE", lexeme: "false", literal: false, line: 0 },
				{ type: "IDENTIFIER", lexeme: "trueValue", literal: null, line: 0 },
				{ type: "IDENTIFIER", lexeme: "falseValue", literal: null, line: 0 },
				{ type: "LET", lexeme: "let", literal: null, line: 0 },
				{ type: "REPEAT", lexeme: "repeat", literal: null, line: 0 },
				{ type: "FUNC", lexeme: "func", literal: null, line: 0 },
				{ type: "LOOP", lexeme: "loop", literal: null, line: 0 },
				{ type: "NULL", lexeme: "null", literal: null, line: 0 },
				{ type: "EOF", lexeme: "", literal: null, line: 0 },
			],
		);
	});

	test("tokenizes comparison and logical operators", () => {
		assert.deepStrictEqual(
			scan("a <= 10 && b >= 20 || !done == false != true"),
			[
				{ type: "IDENTIFIER", lexeme: "a", literal: null, line: 0 },
				{ type: "LESS_EQUAL", lexeme: "<=", literal: null, line: 0 },
				{ type: "NUMBER", lexeme: "10", literal: 10, line: 0 },
				{ type: "AND", lexeme: "&&", literal: null, line: 0 },
				{ type: "IDENTIFIER", lexeme: "b", literal: null, line: 0 },
				{ type: "GREATER_EQUAL", lexeme: ">=", literal: null, line: 0 },
				{ type: "NUMBER", lexeme: "20", literal: 20, line: 0 },
				{ type: "OR", lexeme: "||", literal: null, line: 0 },
				{ type: "BANG", lexeme: "!", literal: null, line: 0 },
				{ type: "IDENTIFIER", lexeme: "done", literal: null, line: 0 },
				{ type: "EQUAL_EQUAL", lexeme: "==", literal: null, line: 0 },
				{ type: "FALSE", lexeme: "false", literal: false, line: 0 },
				{ type: "BANG_EQUAL", lexeme: "!=", literal: null, line: 0 },
				{ type: "TRUE", lexeme: "true", literal: true, line: 0 },
				{ type: "EOF", lexeme: "", literal: null, line: 0 },
			],
		);
	});

	test("ignores line comments", () => {
		assert.deepStrictEqual(scan("let x = 1; // ignore this\nlet y = 2;"), [
			{ type: "LET", lexeme: "let", literal: null, line: 0 },
			{ type: "IDENTIFIER", lexeme: "x", literal: null, line: 0 },
			{ type: "EQUAL", lexeme: "=", literal: null, line: 0 },
			{ type: "NUMBER", lexeme: "1", literal: 1, line: 0 },
			{ type: "SEMICOLON", lexeme: ";", literal: null, line: 0 },
			{ type: "LET", lexeme: "let", literal: null, line: 1 },
			{ type: "IDENTIFIER", lexeme: "y", literal: null, line: 1 },
			{ type: "EQUAL", lexeme: "=", literal: null, line: 1 },
			{ type: "NUMBER", lexeme: "2", literal: 2, line: 1 },
			{ type: "SEMICOLON", lexeme: ";", literal: null, line: 1 },
			{ type: "EOF", lexeme: "", literal: null, line: 1 },
		]);
	});

	test("tokenizes strings", () => {
		assert.deepStrictEqual(scan('fill("tomato");'), [
			{ type: "IDENTIFIER", lexeme: "fill", literal: null, line: 0 },
			{ type: "LEFT_PAREN", lexeme: "(", literal: null, line: 0 },
			{ type: "STRING", lexeme: '"tomato"', literal: "tomato", line: 0 },
			{ type: "RIGHT_PAREN", lexeme: ")", literal: null, line: 0 },
			{ type: "SEMICOLON", lexeme: ";", literal: null, line: 0 },
			{ type: "EOF", lexeme: "", literal: null, line: 0 },
		]);
	});

	test("tokenizes numbers and arithmetic operators", () => {
		assert.deepStrictEqual(scan("1 + 2.5 - 3 * 4 / 5 % 6"), [
			{ type: "NUMBER", lexeme: "1", literal: 1, line: 0 },
			{ type: "PLUS", lexeme: "+", literal: null, line: 0 },
			{ type: "NUMBER", lexeme: "2.5", literal: 2.5, line: 0 },
			{ type: "MINUS", lexeme: "-", literal: null, line: 0 },
			{ type: "NUMBER", lexeme: "3", literal: 3, line: 0 },
			{ type: "STAR", lexeme: "*", literal: null, line: 0 },
			{ type: "NUMBER", lexeme: "4", literal: 4, line: 0 },
			{ type: "SLASH", lexeme: "/", literal: null, line: 0 },
			{ type: "NUMBER", lexeme: "5", literal: 5, line: 0 },
			{ type: "MODULO", lexeme: "%", literal: null, line: 0 },
			{ type: "NUMBER", lexeme: "6", literal: 6, line: 0 },
			{ type: "EOF", lexeme: "", literal: null, line: 0 },
		]);
	});

	test("throws on unterminated strings", () => {
		assert.throws(() => scan('"tomato'), /Unterminated string/);
		assert.throws(() => scan('"tomato\n"'), /Unterminated string/);
	});

	test("throws on single ampersand", () => {
		assert.throws(() => scan("a & b"), /did you mean '&&'/);
	});

	test("throws on single pipe", () => {
		assert.throws(() => scan("a | b"), /did you mean '\|\|'/);
	});
});
