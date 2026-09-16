// ABOUTME: Formats syntactically valid GIC source into a deterministic layout.
// ABOUTME: Preserves line comments and leaves invalid documents unchanged.

import { GicError, ParserError } from "./error.ts";
import { Lexer } from "./lexer.ts";
import { Parser } from "./parser.ts";
import { EOF, type Token, type TokenType } from "./tokens.ts";

type FormatItem =
	| { kind: "comment"; text: string }
	| { kind: "token"; token: Token };

const binaryOperators = new Set<TokenType>([
	"AND",
	"BANG_EQUAL",
	"EQUAL",
	"EQUAL_EQUAL",
	"GREATER",
	"GREATER_EQUAL",
	"LESS",
	"LESS_EQUAL",
	"MODULO",
	"OR",
	"PLUS",
	"SLASH",
	"STAR",
]);

const wordTokens = new Set<TokenType>([
	"ELSE",
	"FALSE",
	"FUNC",
	"IDENTIFIER",
	"IF",
	"LET",
	"LOOP",
	"NULL",
	"NUMBER",
	"REPEAT",
	"RETURN",
	"STRING",
	"TRUE",
]);

const unaryPredecessors = new Set<TokenType>([
	"AND",
	"BANG",
	"BANG_EQUAL",
	"COMMA",
	"EQUAL",
	"EQUAL_EQUAL",
	"GREATER",
	"GREATER_EQUAL",
	"LEFT_BRACE",
	"LEFT_PAREN",
	"LESS",
	"LESS_EQUAL",
	"MINUS",
	"MODULO",
	"OR",
	"PLUS",
	"SEMICOLON",
	"SLASH",
	"STAR",
]);

function commentsIn(source: string): FormatItem[] {
	return [...source.matchAll(/\/\/[^\r\n]*/g)].map(([text]) => ({
		kind: "comment",
		text,
	}));
}

function formatItems(source: string, tokens: Token[]): FormatItem[] {
	const items: FormatItem[] = [];
	let sourceOffset = 0;

	for (const token of tokens) {
		items.push(...commentsIn(source.slice(sourceOffset, token.start)));
		items.push({ kind: "token", token });
		sourceOffset = token.end;
	}
	items.push(...commentsIn(source.slice(sourceOffset)));
	return items;
}

function validTokens(source: string): Token[] | undefined {
	try {
		const tokens = new Lexer(source).scanTokens();
		new Parser(tokens).parse();
		return tokens.filter(({ type }) => type !== EOF);
	} catch (error: unknown) {
		if (error instanceof GicError || error instanceof ParserError) {
			return undefined;
		}
		throw error;
	}
}

class SourceWriter {
	private indentation = 0;
	private lineStart = true;
	private output = "";
	private previousToken: TokenType | undefined;

	format(items: FormatItem[]): string {
		for (const [index, item] of items.entries()) {
			if (item.kind === "comment") {
				this.writeComment(item.text);
				continue;
			}

			const nextToken = items
				.slice(index + 1)
				.find(
					(candidate): candidate is Extract<FormatItem, { kind: "token" }> =>
						candidate.kind === "token",
				)?.token.type;
			this.writeToken(item.token, nextToken);
		}

		this.output = this.output.trimEnd();
		return this.output.length === 0 ? "" : `${this.output}\n`;
	}

	private writeToken(token: Token, nextToken: TokenType | undefined): void {
		switch (token.type) {
			case "LEFT_BRACE":
				this.space();
				this.write(token.lexeme);
				this.indentation++;
				this.newline();
				break;
			case "RIGHT_BRACE":
				if (!this.lineStart) {
					this.newline();
				}
				this.indentation--;
				this.write(token.lexeme);
				if (nextToken === "ELSE") {
					this.space();
				} else {
					this.newline();
				}
				break;
			case "SEMICOLON":
				this.trimLineEnd();
				this.write(token.lexeme);
				this.newline();
				break;
			case "COMMA":
				this.trimLineEnd();
				this.write(token.lexeme);
				this.space();
				break;
			case "LEFT_PAREN":
				if (this.previousToken === "IF") {
					this.space();
				}
				this.write(token.lexeme);
				break;
			case "RIGHT_PAREN":
				this.trimLineEnd();
				this.write(token.lexeme);
				break;
			case "BANG":
				if (this.previousToken === "RETURN") {
					this.space();
				}
				this.write(token.lexeme);
				break;
			case "MINUS":
				if (this.isUnaryMinus()) {
					if (this.previousToken === "RETURN") {
						this.space();
					}
					this.write(token.lexeme);
				} else {
					this.writeBinaryOperator(token.lexeme);
				}
				break;
			default:
				if (binaryOperators.has(token.type)) {
					this.writeBinaryOperator(token.lexeme);
				} else {
					if (
						this.previousToken !== undefined &&
						wordTokens.has(this.previousToken) &&
						wordTokens.has(token.type)
					) {
						this.space();
					}
					this.write(token.lexeme);
				}
		}
		this.previousToken = token.type;
	}

	private isUnaryMinus(): boolean {
		return (
			this.previousToken === undefined ||
			this.previousToken === "RETURN" ||
			unaryPredecessors.has(this.previousToken)
		);
	}

	private writeBinaryOperator(operator: string): void {
		this.trimLineEnd();
		this.space();
		this.write(operator);
		this.space();
	}

	private writeComment(comment: string): void {
		if (!this.lineStart) {
			this.newline();
		}
		this.write(comment);
		this.newline();
	}

	private write(text: string): void {
		if (this.lineStart) {
			this.output += "\t".repeat(this.indentation);
			this.lineStart = false;
		}
		this.output += text;
	}

	private space(): void {
		if (
			!this.lineStart &&
			!this.output.endsWith(" ") &&
			!this.output.endsWith("\n")
		) {
			this.output += " ";
		}
	}

	private newline(): void {
		this.trimLineEnd();
		if (!this.output.endsWith("\n")) {
			this.output += "\n";
		}
		this.lineStart = true;
	}

	private trimLineEnd(): void {
		this.output = this.output.replace(/[ \t]+$/u, "");
	}
}

export function formatSource(source: string): string {
	const tokens = validTokens(source);
	if (tokens === undefined) {
		return source;
	}

	return new SourceWriter().format(formatItems(source, tokens));
}
