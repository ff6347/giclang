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
import { background } from "./draw/background.ts";
import { circle } from "./draw/circle.ts";
import { Environment } from "./environment.ts";
import { GicError } from "./error.ts";
import { applyBinaryOperation, applyUnaryOperation } from "./operators.ts";

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
		return applyUnaryOperation(operator, value);
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
		return applyBinaryOperation(expr.operator, left, right);
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
		const values = expr.arguments.map((arg) =>
			this.evaluateExpression(arg, commands, currentEnvironment),
		);
		switch (expr.callee.name.lexeme) {
			case "circle": {
				commands.push(
					circle({
						values,
						token: expr.callee.name,
					}),
				);
				return VOID;
			}
			case "background": {
				if (values.length === 3) {
					commands.push(
						background({
							values,
							token: expr.callee.name,
						}),
					);
				}
				return VOID;
			}
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
