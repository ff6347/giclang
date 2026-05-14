import {
	EOF,
	EQUAL,
	FALSE,
	IDENTIFIER,
	LET,
	NUMBER,
	SEMICOLON,
	STRING,
	TRUE,
	type Token,
	type TokenType,
} from "./tokens.ts";
import type { Expression, Program, Statement, VarDeclStmt } from "./ast.ts";
import { ParserError } from "./error.ts";

// parser.ts;
export class Parser {
	tokens: Token[] = [];
	current: number = 0;
	constructor(tokens: Token[]) {
		this.tokens = tokens;
	}

	parse(): Program {
		const statements: Statement[] = [];
		while (!this.isAtEnd()) {
			statements.push(this.declaration());
		}
		return { type: "Program", statements };
	}
	declaration(): Statement {
		// try {
		if (this.match(LET)) return this.varDeclaration();
		return this.statement();
		// } catch (e: unknown) {
		// if (e instanceof ParserError) {
		// 	this.synchronize();
		// }
		// @ts-ignore
		// return null;
		// }
		// }
		// synchronize() {
		// throw new Error("Method not implemented.");
	}
	statement(): Statement {
		// if(this.match(IF))
		// return this.ifStatement();
		// if(this.match(REPEAT))
		// return this.whileStatement();
		// if(this.match(RETURN))
		// return this.returnStatement();
		// TODO: We will get here soon
		// if(this.match(LEFT_BRACE))
		// return this.blockStatement();
		return this.expressionStatement();
	}
	expressionStatement(): Statement {
		throw new Error("Method not implemented.");
	}
	varDeclaration(): VarDeclStmt {
		const name: Token = this.consume(IDENTIFIER, "Expected variable name.");
		this.consume(EQUAL, "Expected '=' sign after variable name.");
		const initializer = this.expression();
		this.consume(SEMICOLON, "Expected semicolon after variable declaration.");
		return {
			type: "VarDecl",
			name,
			initializer,
		};
	}
	expression(): Expression {
		return this.primary();
		// return this.assignment();
	}
	primary(): Expression {
		if (this.match(IDENTIFIER)) {
			return {
				type: "Identifier",
				name: this.previous(),
			};
		}
		if (this.match(TRUE, FALSE)) {
			return {
				type: "Literal",
				value: this.previous().literal as boolean,
			};
		}
		if (this.match(NUMBER, STRING)) {
			const token = this.previous();
			return {
				type: "Literal",
				value: token.literal as number | string,
			};
		}
		throw new ParserError("Expected Expression.", this.peek());
	}
	assignment(): Expression {
		throw new Error("Method not implemented.");
	}
	consume(type: TokenType, message: string): Token {
		if (this.check(type)) {
			return this.advance();
		}
		throw new ParserError(message, this.tokens.at(this.current - 1));
	}
	match(...types: TokenType[]): boolean {
		for (const type of types) {
			if (this.check(type)) {
				this.advance();
				return true;
			}
		}
		return false;
	}
	advance(): Token {
		if (!this.isAtEnd()) this.current++;
		return this.previous();
	}
	previous(): Token {
		const token = this.tokens.at(this.current - 1);
		if (token === undefined)
			throw new ParserError(
				"Previous token is undefined.",
				this.tokens.at(this.current - 1),
			);
		return token;
	}
	check(type: TokenType): boolean {
		if (this.isAtEnd()) return false;
		return this.peek()?.type === type;
	}

	isAtEnd(): boolean {
		return this.peek()?.type === EOF;
	}
	peek() {
		return this.tokens.at(this.current);
	}
}
