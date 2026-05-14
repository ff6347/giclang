interface IToken {
	toString(): string;
	lexeme: string;
	line: number;
	literal: unknown;
	type: TokenType;
}

export class Token implements IToken {
	lexeme: string;
	line: number;
	literal: unknown;
	type: TokenType;

	constructor(type: TokenType, lexeme: string, literal: unknown, line: number) {
		this.lexeme = lexeme;
		this.line = line;
		this.literal = literal;
		this.type = type;
	}

	toString(): string {
		return `${this.type} ${this.lexeme} ${this.literal}`;
	}
}

export const EOF: "EOF" = "EOF";
export const LEFT_PAREN: "LEFT_PAREN" = "LEFT_PAREN";
export const RIGHT_PAREN: "RIGHT_PAREN" = "RIGHT_PAREN";
export const LEFT_BRACE: "LEFT_BRACE" = "LEFT_BRACE";
export const RIGHT_BRACE: "RIGHT_BRACE" = "RIGHT_BRACE";
export const COMMA: "COMMA" = "COMMA";
export const MINUS: "MINUS" = "MINUS";
export const PLUS: "PLUS" = "PLUS";
export const SEMICOLON: "SEMICOLON" = "SEMICOLON";
export const SLASH: "SLASH" = "SLASH";
export const STAR: "STAR" = "STAR";
export const BANG: "BANG" = "BANG";
export const BANG_EQUAL: "BANG_EQUAL" = "BANG_EQUAL";
export const EQUAL: "EQUAL" = "EQUAL";
export const EQUAL_EQUAL: "EQUAL_EQUAL" = "EQUAL_EQUAL";
export const GREATER: "GREATER" = "GREATER";
export const GREATER_EQUAL: "GREATER_EQUAL" = "GREATER_EQUAL";
export const OR: "OR" = "OR";
export const AND: "AND" = "AND";
export const LESS: "LESS" = "LESS";
export const LESS_EQUAL: "LESS_EQUAL" = "LESS_EQUAL";
export const IDENTIFIER: "IDENTIFIER" = "IDENTIFIER";
export const STRING: "STRING" = "STRING";
export const NUMBER: "NUMBER" = "NUMBER";
export const ELSE: "ELSE" = "ELSE";
export const FALSE: "FALSE" = "FALSE";
export const FUNC: "FUNC" = "FUNC";
export const IF: "IF" = "IF";
export const RETURN: "RETURN" = "RETURN";
export const TRUE: "TRUE" = "TRUE";
export const LET: "LET" = "LET";
export const REPEAT: "REPEAT" = "REPEAT";
export const LOOP: "LOOP" = "LOOP";
export const NULL: "NULL" = "NULL";
export const MODULO: "MODULO" = "MODULO";

export type TokenType =
	| "LEFT_PAREN"
	| "RIGHT_PAREN"
	| "LEFT_BRACE"
	| "RIGHT_BRACE"
	| "COMMA"
	| "DOT"
	| "MINUS"
	| "PLUS"
	| "SEMICOLON"
	| "SLASH"
	| "STAR"
	| "BANG"
	| "BANG_EQUAL"
	| "EQUAL"
	| "EQUAL_EQUAL"
	| "GREATER"
	| "GREATER_EQUAL"
	| "LESS"
	| "OR"
	| "AND"
	| "MODULO"
	| "LESS_EQUAL"
	| "IDENTIFIER"
	| "STRING"
	| "NUMBER"
	| "ELSE"
	| "FALSE"
	| "FUNC"
	| "IF"
	| "RETURN"
	| "TRUE"
	| "LET"
	| "REPEAT"
	| "LOOP"
	| "NULL"
	| "EOF";
