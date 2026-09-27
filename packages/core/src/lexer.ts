// ABOUTME: The lexer that turns source into tokens
import { GicError } from "./error.ts";
import { keywords, type SyntaxKeywords } from "./keywords.ts";
import {
	AND,
	BANG,
	BANG_EQUAL,
	COMMA,
	EOF,
	EQUAL,
	EQUAL_EQUAL,
	FALSE,
	GREATER,
	GREATER_EQUAL,
	IDENTIFIER,
	LEFT_BRACE,
	LEFT_PAREN,
	LESS,
	LESS_EQUAL,
	MINUS,
	MODULO,
	NUMBER,
	OR,
	PLUS,
	RIGHT_BRACE,
	RIGHT_PAREN,
	SEMICOLON,
	SLASH,
	STAR,
	STRING,
	Token,
	TRUE,
	type TokenType,
} from "./tokens.ts";

function isKeyword(word: string): word is SyntaxKeywords {
	return word in keywords;
}

export class Lexer {
	source: string;
	start: number = 0;
	current: number = 0;
	line: number = 0;
	tokens: Token[] = [];

	constructor(source: string) {
		this.source = source;
	}

	scanTokens(): Token[] {
		while (!this.isAtEnd()) {
			this.start = this.current;
			this.scanToken();
		}
		this.start = this.current;
		this.tokens.push(
			new Token(EOF, "", null, this.line, this.start, this.current),
		);
		return this.tokens;
	}

	isAtEnd(): boolean {
		return this.current >= this.source.length;
	}
	advance(): string {
		return this.source.charAt(this.current++);
	}
	addToken(type: TokenType, literal: unknown = null) {
		const text = this.source.substring(this.start, this.current);
		this.tokens.push(
			new Token(type, text, literal, this.line, this.start, this.current),
		);
	}
	scanToken(): void {
		const c = this.advance();
		switch (c) {
			case "(":
				this.addToken(LEFT_PAREN);
				break;
			case ")":
				this.addToken(RIGHT_PAREN);
				break;
			case "{":
				this.addToken(LEFT_BRACE);
				break;
			case "}":
				this.addToken(RIGHT_BRACE);
				break;
			case ",":
				this.addToken(COMMA);
				break;
			case "|":
				if (this.match("|")) {
					this.addToken(OR);
				} else {
					throw new GicError(
						"Unexpected |, did you mean '||'?",
						this.line,
						this.start,
						this.current,
					);
				}
				break;
			case "&":
				if (this.match("&")) {
					this.addToken(AND);
				} else {
					throw new GicError(
						"Unexpected &, did you mean '&&'?",
						this.line,
						this.start,
						this.current,
					);
				}
				break;
			case "%":
				this.addToken(MODULO);
				break;
			case ";":
				this.addToken(SEMICOLON);
				break;
			case "<":
				this.addToken(this.match("=") ? LESS_EQUAL : LESS);
				break;
			case ">":
				this.addToken(this.match("=") ? GREATER_EQUAL : GREATER);
				break;
			case "=":
				this.addToken(this.match("=") ? EQUAL_EQUAL : EQUAL);
				break;
			case "!":
				this.addToken(this.match("=") ? BANG_EQUAL : BANG);
				break;
			case "-":
				this.addToken(MINUS);
				break;
			case "+":
				this.addToken(PLUS);
				break;
			case "*":
				this.addToken(STAR);
				break;
			case "/":
				if (this.match("/")) {
					// we have a comment here
					while (this.peek() !== "\n" && !this.isAtEnd()) {
						this.advance();
					}
				} else {
					this.addToken(SLASH);
				}
				break;
			case " ":
			case "\t":
			case "\r":
				// Ignore whitespace
				break;
			case "\n":
				this.line++;
				break;
			case '"':
				this.string();
				break;

			default:
				if (this.isDigit(c)) {
					this.number();
				} else if (this.isAlpha(c)) {
					this.identifier();
				} else {
					throw new GicError(
						"Unexpected character",
						this.line,
						this.start,
						this.current,
					);
				}
				break;
		}
	}
	match(expected: string): boolean {
		if (this.isAtEnd()) {
			return false;
		}
		if (this.source.charAt(this.current) !== expected) {
			return false;
		}
		this.current++;
		return true;
	}
	string() {
		while (this.peek() !== '"' && this.peek() !== "\n" && !this.isAtEnd()) {
			this.advance();
		}
		if (this.peek() === "\n" || this.isAtEnd()) {
			throw new GicError(
				"Unterminated string",
				this.line,
				this.start,
				this.current,
			);
		}

		this.advance();
		const value = this.source.substring(this.start + 1, this.current - 1);
		this.addToken(STRING, value);
	}
	peek(): string {
		if (this.isAtEnd()) {
			return "\0";
		}
		return this.source.charAt(this.current);
	}
	peekNext(): string {
		if (this.current + 1 >= this.source.length) {
			return "\0";
		}
		return this.source.charAt(this.current + 1);
	}

	identifier() {
		while (this.isAlphaNumeric(this.peek())) {
			this.advance();
		}
		let literal: unknown = null;
		const text = this.source.substring(this.start, this.current);

		if (isKeyword(text)) {
			const kind = keywords[text];
			if (kind === TRUE) {
				literal = true;
			} else if (kind === FALSE) {
				literal = false;
			}

			this.addToken(kind, literal);
		} else {
			this.addToken(IDENTIFIER, literal);
		}
	}
	isAlpha(c: string): boolean {
		return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
	}
	isDigit(c: string): boolean {
		return c >= "0" && c <= "9";
	}
	isAlphaNumeric(c: string) {
		return this.isAlpha(c) || this.isDigit(c);
	}
	number() {
		while (this.isDigit(this.peek())) {
			this.advance();
		}
		if (this.peek() === "." && this.isDigit(this.peekNext())) {
			this.advance();
			while (this.isDigit(this.peek())) {
				this.advance();
			}
		}
		const value = this.source.substring(this.start, this.current);
		this.addToken(NUMBER, parseFloat(value));
	}
}
