// ABOUTME: This tracks source location implmentation in lexer
import test, { describe } from "node:test";
import assert from "node:assert";
import { Lexer } from "../lexer.ts";

describe("source location tracking", () => {
	test("Should have start end and line fields", () => {
		const lexer = new Lexer(`let x = 0;`);
		const tokens = lexer.scanTokens();

		assert.strictEqual(tokens.length, 6);
		// let
		assert.strictEqual(tokens[0]?.start, 0);
		assert.strictEqual(tokens[0].end, 3);
		assert.strictEqual(tokens[0].line, 0);
		// x
		assert.strictEqual(tokens[1]?.start, 4);
		assert.strictEqual(tokens[1].end, 5);
		assert.strictEqual(tokens[1].line, 0);
		// =
		assert.strictEqual(tokens[2]?.start, 6);
		assert.strictEqual(tokens[2].end, 7);
		assert.strictEqual(tokens[2].line, 0);
		// 0
		assert.strictEqual(tokens[3]?.start, 8);
		assert.strictEqual(tokens[3].end, 9);
		assert.strictEqual(tokens[3].line, 0);
		// ;
		assert.strictEqual(tokens[4]?.start, 9);
		assert.strictEqual(tokens[4].end, 10);
		assert.strictEqual(tokens[4].line, 0);
		// EOF
		assert.strictEqual(tokens[5]?.start, 10);
		assert.strictEqual(tokens[5].end, 10);
		assert.strictEqual(tokens[5].line, 0);
	});

	test("Should set EOF to 0,0 on empty input", () => {
		const lexer = new Lexer("");
		const tokens = lexer.scanTokens();
		assert.strictEqual(tokens.length, 1);
		assert.strictEqual(tokens[0]?.start, 0);
		assert.strictEqual(tokens[0].end, 0);
		assert.strictEqual(tokens[0].line, 0);
	});
	test("Should reflect all lines in source location", () => {
		const lexer = new Lexer(`let x = 0;\n\n`);
		const tokens = lexer.scanTokens();
		assert.strictEqual(tokens.length, 6);

		assert.strictEqual(tokens[5]?.start, 12);
		assert.strictEqual(tokens[5].end, 12);
		assert.strictEqual(tokens[5].line, 2);
	});

	test("Should track multi line positions of tokens", () => {
		const lexer = new Lexer(`let x = 0;\nlet y = 1;\n`);
		const tokens = lexer.scanTokens();
		const eofToken = tokens[10];
		assert.strictEqual(tokens.length, 11);
		assert.strictEqual(eofToken?.start, 22);
		assert.strictEqual(eofToken.end, 22);
		assert.strictEqual(eofToken.line, 2);
	});
});
