// ABOUTME: Executes GIC AST programs and emits platform-neutral render commands.
// ABOUTME: Keeps language evaluation separate from browser and Canvas APIs.

import type {
	Assignment,
	BinaryExpr,
	CallExpr,
	Expression,
	ExprStmt,
	GroupingExpr,
	IdentifierExpr,
	IfStmt,
	LiteralExpr,
	LiteralValue,
	Program,
	Statement,
	UnaryExpr,
	VarDeclStmt,
} from "./ast.ts";
import type { Command } from "./commands.ts";
import { Environment } from "./environment.ts";
import { GicError } from "./error.ts";
import type { Token } from "./tokens.ts";

const VOID = Symbol("void");
type EvaluationResult = LiteralValue | typeof VOID;

export class Interpreter {
	private program: Program;
	private globals: Environment = new Environment(null);
	constructor(program: Program) {
		this.program = program;
	}

	private executeStatement(
		statement: Statement,
		commands: Command[],
		currentEnvironment: Environment,
	) {
		switch (statement.type) {
			case "IfStmt": {
				this.onIfStmt(statement, commands, currentEnvironment);
				break;
			}
			case "Assignment": {
				this.onAssignment(statement, commands, currentEnvironment);
				break;
			}
			case "VarDecl": {
				this.onVarDecl(statement, commands, currentEnvironment);
				break;
			}
			case "ExprStmt":
				this.onExprStmt(statement, commands, currentEnvironment);
				break;
			default:
				break;
		}
	}
	onIfStmt(
		statement: IfStmt,
		commands: Command[],
		currentEnvironment: Environment,
	): void {
		const condition = this.evaluateExpression(
			statement.condition,
			commands,
			currentEnvironment,
		);
		if (condition === VOID) {
			throw new Error("If condition did not produce a value");
		}
		if (typeof condition !== "boolean") {
			throw new GicError(
				"Cannot use non-boolean value as condition.",
				statement.keyword.line,
				statement.keyword.start,
				statement.keyword.end,
			);
		}
		if (condition) {
			const thenEnv = new Environment(currentEnvironment);
			for (const branch of statement.thenBranch) {
				this.executeStatement(branch, commands, thenEnv);
			}
		} else if (statement.elseBranch) {
			const elseEnv = new Environment(currentEnvironment);
			for (const branch of statement.elseBranch) {
				this.executeStatement(branch, commands, elseEnv);
			}
		}
	}
	onAssignment(
		statement: Assignment,
		commands: Command[],
		currentEnvironment: Environment,
	) {
		const value = this.evaluateExpression(
			statement.value,
			commands,
			currentEnvironment,
		);
		if (value === VOID) {
			throw new Error(
				`Assignment value did not produce a value '${statement.name.lexeme}'`,
			);
		}
		const result = currentEnvironment.assign(statement.name.lexeme, value);
		if (!result) {
			throw new GicError(
				`Cannot find name '${statement.name.lexeme}'.`,
				statement.name.line,
				statement.name.start,
				statement.name.end,
			);
		}
	}
	onVarDecl(
		statement: VarDeclStmt,
		commands: Command[],
		currentEnvironment: Environment,
	) {
		const value = this.evaluateExpression(
			statement.initializer,
			commands,
			currentEnvironment,
		);
		if (value === VOID) {
			throw new Error(
				`Variable initializer did not produce a value '${statement.name.lexeme}'`,
			);
		}
		currentEnvironment.set(statement.name.lexeme, value);
	}

	private evaluateExpression(
		expr: Expression,
		commands: Command[],
		currentEnvironment: Environment,
	): EvaluationResult {
		switch (expr.type) {
			case "Unary":
				return this.onUnary(expr, commands, currentEnvironment);

			case "Grouping":
				return this.onGrouping(expr, commands, currentEnvironment);
			case "Binary":
				return this.onBinary(expr, commands, currentEnvironment);
			case "Literal":
				return this.onLiteral(expr);

			case "Identifier":
				return this.onIdentifier(expr, currentEnvironment);

			case "Call":
				return this.onCall(expr, commands, currentEnvironment);
			default:
				throw new Error(`Unknown expression type: ${expr.type}`);
		}
	}
	onUnary(
		expr: UnaryExpr,
		commands: Command[],
		currentEnvironment: Environment,
	): LiteralValue {
		const operator = expr.operator;
		const value = this.evaluateExpression(
			expr.right,
			commands,
			currentEnvironment,
		);
		if (value === VOID) {
			throw new Error(`Cannot perform unary operation on void value`);
		}
		return this.applyUnaryOperation(operator, value);
	}
	applyUnaryOperation(
		token: Token,
		value: string | number | boolean,
	): LiteralValue {
		switch (token.type) {
			case "MINUS":
				if (typeof value !== "number") {
					throw new GicError(
						`Cannot perform unary operation on non-number value.`,
						token.line,
						token.start,
						token.end,
					);
				}
				return -value;
			case "BANG":
				if (typeof value !== "boolean") {
					throw new GicError(
						`Cannot perform unary operation on non-boolean value.`,
						token.line,
						token.start,
						token.end,
					);
				}
				return !value;

			default:
				throw new Error(`Unknown unary operation: ${token.lexeme}`);
		}
	}
	onGrouping(
		expr: GroupingExpr,
		commands: Command[],
		currentEnvironment: Environment,
	): LiteralValue {
		const value = this.evaluateExpression(
			expr.expression,
			commands,
			currentEnvironment,
		);
		if (value === VOID) {
			throw new Error(`Cannot perform grouping on void value`);
		}
		return value;
	}
	onBinary(
		expr: BinaryExpr,
		commands: Command[],
		currentEnvironment: Environment,
	): LiteralValue {
		const left = this.evaluateExpression(
			expr.left,
			commands,
			currentEnvironment,
		);
		if (left === VOID) {
			throw new GicError(
				`Cannot perform binary operation on void value`,
				expr.operator.line,
				expr.operator.start,
				expr.operator.end,
			);
		}
		const right = this.evaluateExpression(
			expr.right,
			commands,
			currentEnvironment,
		);
		if (right === VOID) {
			throw new GicError(
				`Cannot perform binary operation on void value`,
				expr.operator.line,
				expr.operator.start,
				expr.operator.end,
			);
		}

		switch (expr.operator.type) {
			case "GREATER":
				if (typeof left === "number" && typeof right === "number") {
					return left > right;
				} else {
					throw new GicError(
						`Cannot compare non-number values.`,
						expr.operator.line,
						expr.operator.start,
						expr.operator.end,
					);
				}
			// case "PLUS":
			// return left + right;
			// case "MINUS":
			// return left - right;
			case "STAR":
				if (typeof left === "number" && typeof right === "number") {
					return left * right;
				} else {
					throw new GicError(
						`Cannot perform multiplication on non-number values`,
						expr.operator.line,
						expr.operator.start,
						expr.operator.end,
					);
				}
			// case "SLASH":
			// return left / right;
			default:
				throw new Error(`Unknown operator: ${expr.operator.lexeme}`);
		}
	}
	onLiteral(expr: LiteralExpr): LiteralValue {
		return expr.value;
	}
	onIdentifier(
		expr: IdentifierExpr,
		currentEnvironment: Environment,
	): LiteralValue {
		const value = currentEnvironment.get(expr.name.lexeme);
		if (value === undefined) {
			throw new GicError(
				`Cannot find name '${expr.name.lexeme}'`,
				expr.name.line,
				expr.name.start,
				expr.name.end,
			);
		} else {
			return value;
		}
	}

	private onExprStmt(
		statement: ExprStmt,
		commands: Command[],
		currentEnvironment: Environment,
	) {
		this.evaluateExpression(statement.expression, commands, currentEnvironment);
	}

	private onCall(
		expr: CallExpr,
		commands: Command[],
		currentEnvironment: Environment,
	): EvaluationResult {
		switch (expr.callee.name.lexeme) {
			case "circle": {
				if (expr.arguments.length === 3) {
					const [x, y, radius] = expr.arguments;

					if (x !== undefined && y !== undefined && radius !== undefined) {
						const xValue = this.evaluateExpression(
							x,
							commands,
							currentEnvironment,
						);
						const yValue = this.evaluateExpression(
							y,
							commands,
							currentEnvironment,
						);
						const radiusValue = this.evaluateExpression(
							radius,
							commands,
							currentEnvironment,
						);

						if (
							typeof xValue === "number" &&
							typeof yValue === "number" &&
							typeof radiusValue === "number"
						) {
							commands.push({
								type: "circle",
								x: xValue,
								y: yValue,
								radius: radiusValue,
							});
						} else {
							if (typeof xValue !== "number") {
								throw new GicError(
									"circle x argument must be a number",
									expr.callee.name.line,
									expr.callee.name.start,
									expr.callee.name.end,
								);
							}
							if (typeof yValue !== "number") {
								throw new GicError(
									"circle y argument must be a number",
									expr.callee.name.line,
									expr.callee.name.start,
									expr.callee.name.end,
								);
							}
							if (typeof radiusValue !== "number") {
								throw new GicError(
									"circle radius argument must be a number",
									expr.callee.name.line,
									expr.callee.name.start,
									expr.callee.name.end,
								);
							}
						}
					}
				}
				return VOID;
			}
			case "background":
				{
					if (expr.arguments.length === 3) {
						const [lightness, chroma, hue] = expr.arguments;
						if (
							lightness !== undefined &&
							chroma !== undefined &&
							hue !== undefined
						) {
							const lightnessValue = this.evaluateExpression(
								lightness,
								commands,
								currentEnvironment,
							);
							const chromaValue = this.evaluateExpression(
								chroma,
								commands,
								currentEnvironment,
							);
							const hueValue = this.evaluateExpression(
								hue,
								commands,
								currentEnvironment,
							);

							if (
								typeof lightnessValue === "number" &&
								typeof chromaValue === "number" &&
								typeof hueValue === "number"
							) {
								commands.push({
									type: "background",
									lightness: lightnessValue,
									chroma: chromaValue,
									hue: hueValue,
								});
							} else {
								if (typeof lightnessValue !== "number") {
									throw new GicError(
										"background arguments lightness must be numbers",
										expr.callee.name.line,
										expr.callee.name.start,
										expr.callee.name.end,
									);
								}

								if (typeof chromaValue !== "number") {
									throw new GicError(
										"background arguments chroma must be numbers",
										expr.callee.name.line,
										expr.callee.name.start,
										expr.callee.name.end,
									);
								}

								if (typeof hueValue !== "number") {
									throw new GicError(
										"background arguments hue must be numbers",
										expr.callee.name.line,
										expr.callee.name.start,
										expr.callee.name.end,
									);
								}
							}
						}
					}
				}
				return VOID;
			default:
				return VOID;
		}
	}
	interpret(): Command[] {
		const commands: Command[] = [];
		for (const statement of this.program.statements) {
			this.executeStatement(statement, commands, this.globals);
		}
		return commands;
	}
}
