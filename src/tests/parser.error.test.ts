// ABOUTME: Tests parser errors for malformed GIC syntax.
// ABOUTME: Verifies diagnostics identify the unexpected source token.

import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { Lexer } from "../lexer.ts";
import { Parser } from "../parser.ts";
import type { ParserError } from "../error.ts";

describe("parser errors", () => {
	test("Should throw an error and point to missing character", () => {
		const lexer = new Lexer(`
			if (x > 10 {
				x = 0;
			}
			`);

		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);

		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				console.error(error);
				assert.equal(error.token?.lexeme, "{");
				return true;
			},
		);
	});
});
