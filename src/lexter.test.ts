import assert from "node:assert";
import { describe, test } from "node:test";
import { Lexer } from "./lexer.ts";

describe("Lexter", () => {
	test("should tokenize a simple expression", () => {
		const lexer = new Lexer("let foo = 1;");

		const tokens = lexer.scanTokens();

		const actual = tokens.map((token) => ({
			type: token.type,
			lexeme: token.lexeme,
			literal: token.literal,
			line: token.line,
		}));

		assert.deepStrictEqual(actual, [
			{ type: "LET", lexeme: "let", literal: null, line: 1 },
			{ type: "IDENTIFIER", lexeme: "foo", literal: null, line: 1 },
			{ type: "EQUAL", lexeme: "=", literal: null, line: 1 },
			{ type: "NUMBER", lexeme: "1", literal: 1, line: 1 },
			{ type: "SEMICOLON", lexeme: ";", literal: null, line: 1 },
			{ type: "EOF", lexeme: "", literal: null, line: 1 },
		]);
	});
});
