import test, { describe } from "node:test";
import { Lexer } from "../lexer.ts";
import assert from "node:assert";
import { Parser } from "../parser.ts";
import type { ParserError } from "../error.ts";
import { locate, report } from "../message-formatter.ts";

describe("message-formatter", () => {
	test("should write report string", () => {
		const source = "let x = 0\nloop{}";
		const lexer = new Lexer(source);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				const start = error.start;
				const end = error.end;
				const message = error.message;

				const m = report({
					start: start,
					end,
					message,
					source,
				});
				assert.strictEqual(
					m,
					"Error at line 2, column 1:\n" +
						"  loop{}\n" +
						"  ^^^^\n" +
						"  Expected semicolon after variable declaration.",
				);
				return true;
			},
		);
	});

	test("should write report with proper caret pointer", () => {
		const source = "let x = 0;\nif x < 10){\nx = 10;}";
		const lexer = new Lexer(source);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				const start = error.start;
				const end = error.end;
				const message = error.message;

				const actual = report({
					start: start,
					end,
					message,
					source,
				});
				const expected =
					"Error at line 2, column 4:\n" +
					"  if x < 10){\n" +
					"     ^\n" +
					"  Expected '(' after 'if'.";
				assert.strictEqual(actual, expected);
				return true;
			},
		);
	});

	test("should write report with proper multi caret pointer", () => {
		const source =
			"let foo = 0;\n" + "let y foo;\n" + "let z = 20;\n" + "loop{}";
		const lexer = new Lexer(source);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		assert.throws(
			() => parser.parse(),
			(error: ParserError) => {
				const start = error.start;
				const end = error.end;
				const message = error.message;

				const actual = report({
					start: start,
					end,
					message,
					source,
				});
				const expected =
					"Error at line 2, column 7:\n" +
					"  let y foo;\n" +
					"        ^^^\n" +
					"  Expected '=' sign after variable name.";
				assert.strictEqual(actual, expected);
				return true;
			},
		);
	});

	test("`locate` should return character index of next newline or source.length", () => {
		const source = "let x = 0;\nloop{}";
		const start = 5;
		const { lineEnd, line, column, lineStart } = locate({
			source,
			start,
		});
		assert.strictEqual(line, 0);
		assert.strictEqual(column, 5);
		assert.strictEqual(lineStart, 0);
		assert.strictEqual(lineEnd, 10);
	});

	test("`locate` should return character index of source.length since there is no newline", () => {
		const source = "let x = 0;";
		const start = 3;
		const { lineEnd, line, column, lineStart } = locate({
			source,
			start,
		});
		assert.strictEqual(line, 0);
		assert.strictEqual(column, 3);
		assert.strictEqual(lineStart, 0);
		assert.strictEqual(lineEnd, 10);
		assert.strictEqual(source.length, lineEnd);
	});

	test("`locate` should return character index of next newline from multiline source code", () => {
		const source = "let x = 0;\nlet y = 10;\nlet z = 20;\nloop{}";
		const start = 13;
		const { lineEnd, line, column, lineStart } = locate({
			source,
			start,
		});
		assert.strictEqual(line, 1);
		assert.strictEqual(column, 2);
		assert.strictEqual(lineStart, 11);
		assert.strictEqual(lineEnd, 22);
		assert.strictEqual(source.slice(lineStart, lineEnd), "let y = 10;");
	});
});
