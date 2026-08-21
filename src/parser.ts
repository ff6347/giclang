import {
	AND,
	BANG,
	BANG_EQUAL,
	COMMA,
	ELSE,
	EOF,
	EQUAL,
	EQUAL_EQUAL,
	FALSE,
	FUNC,
	GREATER,
	GREATER_EQUAL,
	IDENTIFIER,
	IF,
	LEFT_BRACE,
	LEFT_PAREN,
	LESS,
	LESS_EQUAL,
	LET,
	LOOP,
	MINUS,
	MODULO,
	NUMBER,
	OR,
	PLUS,
	REPEAT,
	RETURN,
	RIGHT_BRACE,
	RIGHT_PAREN,
	SEMICOLON,
	SLASH,
	STAR,
	STRING,
	TRUE,
	type Token,
	type TokenType,
} from "./tokens.ts";
import type {
	Assignment,
	Expression,
	FuncStmt,
	IdentifierExpr,
	LoopStmt,
	Program,
	RepeatStmt,
	ReturnStmt,
	Statement,
	VarDeclStmt,
} from "./ast.ts";
import { ParserError } from "./error.ts";

// parser.ts;
export class Parser {
	tokens: Token[] = [];
	current: number = 0;
	blockDepth: number = 0;
	constructor(tokens: Token[]) {
		this.tokens = tokens;
	}

	parse(): Program {
		const statements: Statement[] = [];

		while (!this.isAtEnd() && !this.check(LOOP)) {
			statements.push(this.declaration());
		}
		let loopStatement: LoopStmt | undefined = undefined;
		if (this.match(LOOP)) {
			loopStatement = this.loopStatement();
		}
		if (!this.isAtEnd()) {
			throw new ParserError(
				`Unexpected token '${this.peek()?.lexeme}'.${
					this.peek()?.type === LOOP
						? " Only one loop block is allowed and it must be the last construct."
						: ""
				}`,
				this.peek(),
			);
		}

		if (loopStatement) {
			return { type: "Program", statements, loopStatement };
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
		if ((this.check(FUNC) || this.check(LOOP)) && this.blockDepth !== 0) {
			throw new ParserError(
				`Unexpected 'func' or 'loop'. Functions and loops can only be declared at the top level.`,
				this.peek(),
			);
		}
		if (this.match(IF)) return this.ifStatement();
		if (this.match(REPEAT)) return this.repeatStatement();
		if (this.match(FUNC)) return this.funcStatement();
		if (this.match(RETURN)) return this.returnStatement();
		// TODO: We will get here soon
		// if (this.match(LEFT_BRACE)) return this.block();
		if (this.check(IDENTIFIER) && this.checkNext(EQUAL)) {
			return this.assignment();
		}
		return this.expressionStatement();
	}

	returnStatement(): ReturnStmt {
		let value: Expression | undefined = undefined;
		if (!this.check(SEMICOLON)) {
			value = this.expression();
		}
		this.consume(
			SEMICOLON,
			value
				? `Expected ';' after return value.`
				: `Expected ';' after return keyword.`,
		);

		const expr: ReturnStmt = {
			type: "ReturnStmt",
		};
		if (value) {
			expr.value = value;
		}

		return expr;
	}

	block(): Statement[] {
		const statements: Statement[] = [];
		while (!this.check(RIGHT_BRACE) && !this.isAtEnd()) {
			statements.push(this.declaration());
		}

		this.consume(RIGHT_BRACE, "Expected '}' after block.");
		this.blockDepth--;

		return statements;
	}
	funcStatement(): Statement {
		const name = this.consume(IDENTIFIER, "Expected function name.");
		this.consume(LEFT_PAREN, "Expected '(' after function name.");

		const params: Token[] | undefined = [];

		while (!this.check(RIGHT_PAREN) && !this.isAtEnd()) {
			params?.push(this.consume(IDENTIFIER, "Expected parameter name."));
			if (this.check(RIGHT_PAREN)) {
				break;
			}
			this.consume(COMMA, "Expected ',' after parameter.");
		}
		this.consume(RIGHT_PAREN, "Expected ')' after parameters.");
		this.consume(LEFT_BRACE, "Expected '{' after parameters.");
		this.blockDepth++;
		const body = this.block();

		const stmt: FuncStmt = {
			type: "FuncStmt",
			name,
			body: body,
		};
		if (params !== undefined) {
			stmt.params = params;
		}
		return stmt;
	}
	loopStatement(): LoopStmt {
		this.consume(LEFT_BRACE, "Expected '{' after loop.");
		this.blockDepth++;
		const body = this.block();

		return {
			type: "LoopStmt",
			body,
		};
	}

	repeatStatement(): Statement {
		this.consume(LEFT_PAREN, "Expected '(' after 'repeat'.");
		const variable = this.consume(IDENTIFIER, "Expected loop variable name.");
		this.consume(COMMA, "Expected ',' after variable.");
		const start = this.expression();
		this.consume(COMMA, "Expected ',' after start.");
		const end = this.expression();
		let step: Expression | undefined = undefined;
		if (this.match(COMMA)) {
			step = this.expression();
		} else if (!this.check("RIGHT_PAREN")) {
			throw new ParserError("Expected ',' after repeat end.", this.peek());
		}
		this.consume(RIGHT_PAREN, "Expected ')' after repeat arguments.");
		this.consume(LEFT_BRACE, "Expected '{' before body");
		this.blockDepth++;
		const body = this.block();
		const stmt: RepeatStmt = {
			type: "RepeatStmt",
			variable,
			start,
			end,
			body,
		};
		if (step !== undefined) {
			stmt.step = step;
		}
		return stmt;
	}
	ifStatement(): Statement {
		this.consume(LEFT_PAREN, "Expected '(' after 'if'.");
		const condition = this.expression();
		this.consume(RIGHT_PAREN, "Expected ')' after condition.");

		this.consume(LEFT_BRACE, "Expected '{' before body");
		this.blockDepth++;
		const thenBranch = this.block();
		let elseBranch: Statement[] | undefined;
		if (this.match(ELSE)) {
			if (this.match(IF)) {
				elseBranch = [this.ifStatement()];
			} else {
				this.consume(LEFT_BRACE, "Expected '{' before else branch");
				this.blockDepth++;
				elseBranch = this.block();
			}
		}
		if (elseBranch !== undefined) {
			return {
				type: "IfStmt",
				condition,
				thenBranch,
				elseBranch,
			};
		}
		return {
			type: "IfStmt",
			condition,
			thenBranch,
		};
	}
	checkNext(type: TokenType): boolean {
		const token = this.tokens.at(this.current + 1);
		if (token === undefined) return false;
		return token.type === type;
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
		return this.call();
	}
	call(): Expression {
		let expr = this.primary();
		while (true) {
			if (this.match(LEFT_PAREN)) {
				if (expr.type !== "Identifier") {
					throw new ParserError(
						"Only function names can be called.",
						this.previous(),
					);
				}
				expr = this.finishCall(expr);
			} else {
				break;
			}
		}
		return expr;
	}
	finishCall(callee: IdentifierExpr): Expression {
		const args: Expression[] = [];
		if (!this.check(RIGHT_PAREN)) {
			do {
				// if (args.length >= 255) {
				// 	throw new ParserError("Too many arguments.", this.peek());
				// }
				args.push(this.expression());
			} while (this.match(COMMA));
		}
		const paren = this.consume(RIGHT_PAREN, "Expected ')' after arguments.");
		return {
			type: "Call",
			callee,
			arguments: args,
			paren,
		};
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
	assignment(): Assignment {
		const name: Token = this.consume(IDENTIFIER, "Expected variable name.");
		this.consume(EQUAL, "Expected '=' after variable name.");
		const value = this.expression();
		this.consume(SEMICOLON, "Expected ';' after assignment");
		return {
			type: "Assignment",
			name,
			value,
		};
	}
	consume(type: TokenType, message: string): Token {
		if (this.check(type)) {
			return this.advance();
		}
		throw new ParserError(message, this.peek());
	}
	/**
	 *  checks and consumes when it matches
	 * @param types list of token types to match
	 * @returns true if the current token matches any of the given types, false otherwise
	 */
	match(...types: TokenType[]): boolean {
		for (const type of types) {
			if (this.check(type)) {
				this.advance();
				return true;
			}
		}
		return false;
	}
	/**
	 * consumes the current token, then returns it. Does not advance at EOF and returns the previous token at EOF
	 * @returns the current token
	 */
	advance(): Token {
		if (!this.isAtEnd()) this.current++;
		return this.previous();
	}
	/**
	 *  look at most recently consumed token
	 */
	previous(): Token {
		const token = this.tokens.at(this.current - 1);
		if (token === undefined)
			throw new ParserError(
				"Previous token is undefined.",
				this.tokens.at(this.current - 1),
			);
		return token;
	}
	/**
	 *  checks the current token’s type without consuming.
	 * @param type
	 * @returns true if the current token's type matches the given type. Always returns false at EOF including `check(EOF)`
	 */
	check(type: TokenType): boolean {
		if (this.isAtEnd()) return false;
		return this.peek()?.type === type;
	}

	isAtEnd(): boolean {
		return this.peek()?.type === EOF;
	}
	/**
	 * Looks at the current token without advancing
	 *
	 */
	peek() {
		return this.tokens.at(this.current);
	}
}
