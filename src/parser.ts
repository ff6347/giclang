import {
	AND,
	BANG,
	BANG_EQUAL,
	EOF,
	EQUAL,
	EQUAL_EQUAL,
	FALSE,
	GREATER,
	GREATER_EQUAL,
	IDENTIFIER,
	LEFT_PAREN,
	LESS,
	LESS_EQUAL,
	LET,
	MINUS,
	MODULO,
	NUMBER,
	OR,
	PLUS,
	RIGHT_PAREN,
	SEMICOLON,
	SLASH,
	STAR,
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
		const expression = this.expression();
		this.consume(SEMICOLON, "Expected ';' after expression");
		return {
			type: "ExprStmt",
			expression,
		};
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
		return this.or();
		// return this.primary();
		// return this.assignment();
	}
	or(): Expression {
		let expr = this.and();
		while (this.match(OR)) {
			const operator = this.previous();
			const right = this.and();
			expr = {
				type: "Logical",
				left: expr,
				operator,
				right,
			};
		}
		return expr;
	}
	and(): Expression {
		let expr = this.equality();
		while (this.match(AND)) {
			const operator = this.previous();
			const right = this.equality();
			expr = {
				type: "Logical",
				left: expr,
				operator,
				right,
			};
		}
		return expr;
	}
	equality(): Expression {
		let expr = this.comparison();
		while (this.match(BANG_EQUAL, EQUAL_EQUAL)) {
			const operator = this.previous();
			const right = this.comparison();
			expr = {
				type: "Binary",
				left: expr,
				operator,
				right,
			};
		}
		return expr;
	}
	comparison(): Expression {
		let expr = this.term();
		while (this.match(LESS, GREATER, LESS_EQUAL, GREATER_EQUAL)) {
			const operator = this.previous();
			const right = this.term();
			expr = {
				type: "Binary",
				left: expr,
				operator,
				right,
			};
		}
		return expr;
	}
	term(): Expression {
		let expr = this.factor();

		while (this.match(PLUS, MINUS)) {
			const operator = this.previous();
			const right = this.factor();
			expr = {
				type: "Binary",
				left: expr,
				operator,
				right,
			};
		}
		return expr;
	}
	factor(): Expression {
		let expr = this.unary();
		while (this.match(SLASH, STAR, MODULO)) {
			const operator = this.previous();
			const right = this.unary();
			expr = {
				type: "Binary",
				left: expr,
				operator,
				right,
			};
		}
		return expr;
	}
	unary(): Expression {
		if (this.match(BANG, MINUS)) {
			const operator = this.previous();
			const right = this.unary();
			return {
				type: "Unary",
				operator,
				right,
			};
		}
		return this.primary();
		// throw new Error("Method not implemented.");
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
		if (this.match(LEFT_PAREN)) {
			const expr = this.expression();
			this.consume(RIGHT_PAREN, "Expected ')' after expression.");
			return {
				type: "Grouping",
				expression: expr,
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
