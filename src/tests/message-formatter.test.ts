import test, { describe } from "node:test";
import { Lexer } from "../lexer.ts";
import assert from "node:assert";
import { Parser } from "../parser.ts";
import type { ParserError } from "../error.ts";
import { report } from "../message-formatter.ts";

describe("message-formatter", () => {
	test("should write report string", () => {
		const source = "let x = 0\nloop{}";
		const lexer = new Lexer(source);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				const line = error.line;
				const start = error.start;
				const end = error.end;
				const where = `at '${error.token?.lexeme}'`;
				const message = error.message;

				const m = report({
					line,
					start,
					end,
					where,
					message,
					source,
				});
				assert.strictEqual(
					m,
					"Error at 'loop' line 2, column 1: Expected semicolon after variable declaration.",
				);
				return true;
			},
		);
	});
});
