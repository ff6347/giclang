interface IToken {
	toString(): string;
	lexeme: string;
	line: number;
	literal: unknown;
	type: TokenType;
	start: number;
	end: number;
}

export class Token implements IToken {
	lexeme: string;
	line: number;
	start: number;
	end: number;
	literal: unknown;
	type: TokenType;

	constructor(
		type: TokenType,
		lexeme: string,
		literal: unknown,
		line: number,
		start: number,
		end: number,
	) {
		this.lexeme = lexeme;
		this.line = line;
		this.literal = literal;
		this.type = type;
		this.start = start;
		this.end = end;
	}

	toString(): string {
		return `${this.type} ${this.lexeme} ${this.literal}`;
	}
}

export const EOF = "EOF" as const;
export const LEFT_PAREN = "LEFT_PAREN" as const;
export const RIGHT_PAREN = "RIGHT_PAREN" as const;
export const LEFT_BRACE = "LEFT_BRACE" as const;
export const RIGHT_BRACE = "RIGHT_BRACE" as const;
export const COMMA = "COMMA" as const;
export const MINUS = "MINUS" as const;
export const PLUS = "PLUS" as const;
export const SEMICOLON = "SEMICOLON" as const;
export const SLASH = "SLASH" as const;
export const STAR = "STAR" as const;
export const BANG = "BANG" as const;
export const BANG_EQUAL = "BANG_EQUAL" as const;
export const EQUAL = "EQUAL" as const;
export const EQUAL_EQUAL = "EQUAL_EQUAL" as const;
export const GREATER = "GREATER" as const;
export const GREATER_EQUAL = "GREATER_EQUAL" as const;
export const OR = "OR" as const;
export const AND = "AND" as const;
export const LESS = "LESS" as const;
export const LESS_EQUAL = "LESS_EQUAL" as const;
export const IDENTIFIER = "IDENTIFIER" as const;
export const STRING = "STRING" as const;
export const NUMBER = "NUMBER" as const;
export const ELSE = "ELSE" as const;
export const FALSE = "FALSE" as const;
export const FUNC = "FUNC" as const;
export const IF = "IF" as const;
export const RETURN = "RETURN" as const;
export const TRUE = "TRUE" as const;
export const LET = "LET" as const;
export const REPEAT = "REPEAT" as const;
export const LOOP = "LOOP" as const;
export const NULL = "NULL" as const;
export const MODULO = "MODULO" as const;

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
