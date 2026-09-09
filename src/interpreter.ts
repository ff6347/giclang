// ABOUTME: Executes GIC AST programs and emits platform-neutral render commands.
// ABOUTME: Keeps language evaluation separate from browser and Canvas APIs.

import type {
	Assignment,
	BinaryExpr,
	CallExpr,
	Expression,
	ExprStmt,
	FuncStmt,
	GroupingExpr,
	IdentifierExpr,
	IfStmt,
	LiteralExpr,
	LiteralValue,
	LogicalExpr,
	Program,
	RepeatStmt,
	ReturnStmt,
	Statement,
	UnaryExpr,
	VarDeclStmt,
} from "./ast.ts";
import type { Command } from "./commands.ts";

import { Environment } from "./environment.ts";
import { GicError } from "./error.ts";
import { requireBoolean } from "./logical.ts";
import { applyBinaryOperation, applyUnaryOperation } from "./operators.ts";
import { requireNumber } from "./interpreter-validation.ts";
import { CallableRegistry, type Callable } from "./callable-registry.ts";
import type { Token } from "./tokens.ts";

const VOID = Symbol("void");
type EvaluationResult = LiteralValue | typeof VOID;

type ReturnSignal = {
	kind: "return";
	value: EvaluationResult;
};

export class Interpreter {
	private program: Program;
	private callables: CallableRegistry = new CallableRegistry();
	private globals: Environment = new Environment(null);
	constructor(program: Program) {
		this.program = program;
	}

	private executeStatement(
		statement: Statement,
		commands: Command[],
		currentEnvironment: Environment,
	): ReturnSignal | undefined {
		switch (statement.type) {
			case "ReturnStmt": {
				return this.onReturnStmt(statement, commands, currentEnvironment);
			}
			case "FuncStmt": {
				this.onFuncStmt(statement);
				break;
			}
			case "RepeatStmt": {
				this.onRepeatStmt(statement, commands, currentEnvironment);
				break;
			}
			case "IfStmt": {
				return this.onIfStmt(statement, commands, currentEnvironment);
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
		return undefined;
	}
	onReturnStmt(
		statement: ReturnStmt,
		commands: Command[],
		currentEnvironment: Environment,
	): ReturnSignal {
		if (statement.value) {
			const value = this.evaluateExpression(
				statement.value,
				commands,
				currentEnvironment,
			);
			return { value, kind: "return" };
		} else {
			return { kind: "return", value: VOID };
		}
	}
	onFuncStmt(statement: FuncStmt) {
		// okay. As I understand it. On funcSTatement only registery a callable in the environment/callable-registry
		// (maybe it is still smart to use the env instead of a own registry)
		// the command evaluation should not happen here since we dont know what the arguments are. so params stay token.
		// should the callable just wrap the func statement?
		// onCall finds a callable, checks if it exists and executes it.
		// evaluates all argument expressions and generates the commands
		this.callables.register(statement.name.lexeme, {
			kind: "user",
			declaration: statement,
		});
	}
	onRepeatStmt(
		statement: RepeatStmt,
		commands: Command[],
		currentEnvironment: Environment,
	) {
		const start = this.evaluateExpression(
			statement.start,
			commands,
			currentEnvironment,
		);

		const startValue = requireNumber(
			start,
			statement.startToken,
			"Expected repeat start value to be a number.",
		);

		const end = this.evaluateExpression(
			statement.end,
			commands,
			currentEnvironment,
		);
		const endValue = requireNumber(
			end,
			statement.endToken,
			"Expected repeat end value to be a number.",
		);

		let stepValue = 1;
		if (statement.step && statement.stepToken) {
			const evalResult = this.evaluateExpression(
				statement.step,
				commands,
				currentEnvironment,
			);
			stepValue = requireNumber(
				evalResult,
				statement.stepToken,
				"Expected repeat step value to be a number.",
			);
		}
		if (stepValue === 0 && statement.stepToken) {
			throw new GicError(
				"Repeat step cannot be zero.",
				statement.stepToken.line,
				statement.stepToken.start,
				statement.stepToken.end,
			);
		}

		const repeatEnv = new Environment(currentEnvironment);

		/*
		Deriving values from the iteration count avoids accumulated floating-point drift.
		------
		What each line does:
 - turn always counts exactly: 0, 1, 2, 3…
 - value is recalculated from the original start.
 - The sign-dependent check stops before the exclusive end.
 - The GIC iterator receives value.
	 */

		for (let turn = 0; ; turn++) {
			const value = startValue + turn * stepValue;
			if (!(stepValue > 0 ? value < endValue : value > endValue)) break;
			repeatEnv.set(statement.variable.lexeme, value);
			for (const cmd of statement.body) {
				this.executeStatement(cmd, commands, repeatEnv);
			}
		}
	}

	onIfStmt(
		statement: IfStmt,
		commands: Command[],
		currentEnvironment: Environment,
	): ReturnSignal | undefined {
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

			const res = this.executeStatements(
				statement.thenBranch,
				commands,
				thenEnv,
			);
			if (res) {
				return res;
			}
		} else if (statement.elseBranch) {
			const elseEnv = new Environment(currentEnvironment);

			const res = this.executeStatements(
				statement.elseBranch,
				commands,
				elseEnv,
			);
			if (res) {
				return res;
			}
		}
		return undefined;
	}
	private executeStatements(
		statements: Statement[],
		commands: Command[],
		currentEnvironment: Environment,
	): ReturnSignal | undefined {
		for (const statement of statements) {
			const res = this.executeStatement(
				statement,
				commands,
				currentEnvironment,
			);
			if (res) {
				return res;
			}
		}
		return undefined;
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
			case "Logical":
				return this.onLogical(expr, commands, currentEnvironment);

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
				throw new Error(`Unknown expression.`);
		}
	}
	onLogical(
		expr: LogicalExpr,
		commands: Command[],
		currentEnvironment: Environment,
	): boolean {
		if (expr.operator.type === "AND" || expr.operator.type === "OR") {
			const left = this.evaluateExpression(
				expr.left,
				commands,
				currentEnvironment,
			);
			if (left === VOID) {
				throw new Error(`Cannot perform logical operation on void value`);
			}
			const leftValue = requireBoolean(expr.operator, left);

			if (leftValue === false && expr.operator.type === "AND") {
				return false;
			}
			if (leftValue === true && expr.operator.type === "OR") {
				return true;
			}

			const right = this.evaluateExpression(
				expr.right,
				commands,
				currentEnvironment,
			);

			if (right === VOID) {
				throw new Error(`Cannot perform logical operation on void value`);
			}

			const rightValue = requireBoolean(expr.operator, right);
			return rightValue;
		}

		throw new Error(`Unknown logical operator: ${expr.operator.type}`);
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
		const name = expr.callee.name.lexeme;

		const callable = this.callables.get(name);

		if (!callable) {
			throw new GicError(
				`Function '${name}' not found`,
				expr.callee.name.line,
				expr.callee.name.start,
				expr.callee.name.end,
			);
		}

		return this.invokeCallable(callable, values, expr.callee.name, commands);
	}
	private invokeCallable(
		callable: Callable,
		values: EvaluationResult[],
		token: Token,
		commands: Command[],
	): EvaluationResult {
		if (callable.kind === "drawing") {
			commands.push(callable.invoke({ values, token }));
			return VOID;
		}
		const statement = callable.declaration;

		const params = statement.params ?? [];
		if (values.length !== params.length) {
			throw new GicError(
				`Expected ${params.length} arguments, got ${values.length}`,
				token.line,
				token.start,
				token.end,
			);
		}
		const funcEnv = new Environment(this.globals);
		for (const [i, param] of params.entries()) {
			const value = values[i];
			if (value === VOID) {
				throw new GicError(
					`Argument must produce a value`,
					token.line,
					token.start,
					token.end,
				);
			}

			if (value === undefined) {
				throw new Error(`Missing evaluated argument at index ${i}.`);
			}

			funcEnv.set(param.lexeme, value);
		}
		const res = this.executeStatements(statement.body, commands, funcEnv);
		if (res) {
			return res.value;
		}

		return VOID;
	}
	interpret(): Command[] {
		const commands: Command[] = [];
		for (const statement of this.program.statements) {
			this.executeStatement(statement, commands, this.globals);
		}
		return commands;
	}
}
