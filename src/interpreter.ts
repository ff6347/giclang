// ABOUTME: Executes GIC AST programs and emits platform-neutral render commands.
// ABOUTME: Keeps language evaluation separate from browser and Canvas APIs.

import type {
	CallExpr,
	Expression,
	ExprStmt,
	Program,
	Statement,
} from "./ast.ts";
import type { Command } from "./commands.ts";

export class Interpreter {
	private program: Program;
	constructor(program: Program) {
		this.program = program;
	}

	private executeStatement(statement: Statement, commands: Command[]) {
		switch (statement.type) {
			case "ExprStmt":
				this.onExprStmt(statement, commands);
				break;
			default:
				break;
		}
	}

	private evaluateExpression(expr: Expression, commands: Command[]) {
		switch (expr.type) {
			case "Call":
				this.onCall(expr, commands);
				break;
			default:
				break;
		}
	}

	private onExprStmt(statement: ExprStmt, commands: Command[]) {
		this.evaluateExpression(statement.expression, commands);
	}

	private onCall(expr: CallExpr, commands: Command[]) {
		switch (expr.callee.name.lexeme) {
			case "background":
				if (expr.arguments.length === 3) {
					const [lightness, chroma, hue] = expr.arguments;
					commands.push({
						type: "background",
						lightness:
							lightness?.type === "Literal" ? (lightness.value as number) : 0,
						chroma: chroma?.type === "Literal" ? (chroma.value as number) : 0,
						hue: hue?.type === "Literal" ? (hue.value as number) : 0,
					});
				}

				break;
			default:
				break;
		}
	}
	interpret(): Command[] {
		const commands: Command[] = [];
		for (const statement of this.program.statements) {
			this.executeStatement(statement, commands);
		}
		return commands;
	}
}
