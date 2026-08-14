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
				assert.equal(error.token?.lexeme, "{");
				return true;
			},
		);
	});
});

describe("parser diagnostics", () => {
	test("should report exact location of error", () => {
		const lexer = new Lexer(`if (x > 10 {
				x = 0;
			}
			`);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);

		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				console.log(error.message);
				assert.equal(error.token?.lexeme, "{");
				assert.equal(error.token?.line, 0);
				assert.equal(error.token?.start, 11);
				assert.equal(error.token?.end, 12);

				return true;
			},
		);
	});
});
