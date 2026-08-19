// ABOUTME: Semantic analyzer that walks the whole AST and collects diagnostics.
// ABOUTME: Harness shell only; semantic rules arrive in later milestones.
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
	LogicalExpr,
	LoopStmt,
	RepeatStmt,
	ReturnStmt,
	Statement,
	UnaryExpr,
	VarDeclStmt,
} from "./ast.ts";
import type { Diagnostic, Program } from "./core.ts";
import type { Token } from "./tokens.ts";

class Scope {
	declarations: Map<string, Token> = new Map();
}

export class Analyser {
	scope: Scope = new Scope();
	diagnostics: Diagnostic[] = [];
	program: Program;
	constructor(program: Program) {
		this.program = program;
	}
	walkStatement(statement: Statement) {
		switch (statement.type) {
			case "ReturnStmt": {
				this.onReturnStmt(statement);
				break;
			}
			case "RepeatStmt": {
				this.onRepeatStmt(statement);
				break;
			}
			case "FuncStmt": {
				this.onFuncStmt(statement);
				break;
			}
			case "Assignment": {
				this.onAssignment(statement);
				break;
			}
			case "ExprStmt": {
				this.onExprStmt(statement);
				break;
			}
			case "IfStmt": {
				this.onIfStmt(statement);
				break;
			}
			case "VarDecl": {
				this.onVarDecl(statement);
				break;
			}
			default: {
				const unreachable: never = statement;
				throw new Error(`Unhandled type ${unreachable} in Analyser.analyze`);
			}
		}
	}
	protected onReturnStmt(statement: ReturnStmt) {
		if (statement.value) {
			this.walkExpression(statement.value);
		}
	}
	protected onRepeatStmt(statement: RepeatStmt) {
		this.walkExpression(statement.start);
		this.walkExpression(statement.end);
		if (statement.step) {
			this.walkExpression(statement.step);
		}
		statement.body.forEach((stmt) => {
			this.walkStatement(stmt);
		});
	}
	protected onFuncStmt(statement: FuncStmt) {
		statement.body.forEach((stmt) => {
			this.walkStatement(stmt);
		});
	}
	protected onAssignment(statement: Assignment) {
		if (!this.scope.declarations.has(statement.name.lexeme)) {
			const diagnostic: Diagnostic = {
				message: `Cannot find name '${statement.name.lexeme}'.`,
				line: statement.name.line,
				start: statement.name.start,
				end: statement.name.end,
			};
			this.diagnostics.push(diagnostic);
		}
		this.walkExpression(statement.value);
	}
	protected onExprStmt(statement: ExprStmt) {
		this.walkExpression(statement.expression);
	}
	protected onVarDecl(statement: VarDeclStmt) {
		this.scope.declarations.set(statement.name.lexeme, statement.name);
		this.walkExpression(statement.initializer);
	}

	protected onIfStmt(statement: IfStmt) {
		this.walkExpression(statement.condition);
		for (const thenStatement of statement.thenBranch) {
			this.walkStatement(thenStatement);
		}
		if (statement.elseBranch) {
			for (const elseStatement of statement.elseBranch) {
				this.walkStatement(elseStatement);
			}
		}
	}

	walkExpression(expr: Expression) {
		switch (expr.type) {
			case "Unary": {
				this.onUnary(expr);
				break;
			}
			case "Logical": {
				this.onLogical(expr);
				break;
			}
			case "Grouping": {
				this.onGrouping(expr);
				break;
			}
			case "Call": {
				this.onCall(expr);
				break;
			}
			case "Binary": {
				this.onBinary(expr);
				break;
			}
			case "Literal": {
				this.onLiteral(expr);
				break;
			}
			case "Identifier": {
				this.onIdentifier(expr);
				break;
			}
			default: {
				const unreachable: never = expr;
				throw new Error(
					`Unhandled type ${unreachable} in Analyser.walkExpression`,
				);
			}
		}
	}
	protected onUnary(expr: UnaryExpr) {
		this.walkExpression(expr.right);
	}
	protected onLogical(expr: LogicalExpr) {
		this.walkExpression(expr.left);
		this.walkExpression(expr.right);
	}
	protected onGrouping(expr: GroupingExpr) {
		this.walkExpression(expr.expression);
	}
	protected onIdentifier(_expr: IdentifierExpr) {
		// leaf: no children to walk
	}
	protected onLiteral(_expr: LiteralExpr) {
		// leaf: no children to walk
	}
	protected onCall(expr: CallExpr) {
		this.walkExpression(expr.callee);
		expr.arguments.forEach((arg) => this.walkExpression(arg));
	}
	protected onBinary(expr: BinaryExpr) {
		this.walkExpression(expr.left);
		this.walkExpression(expr.right);
	}

	analyze(): Diagnostic[] {
		for (const statement of this.program.statements) {
			this.walkStatement(statement);
		}
		if (this.program.loopStatement) {
			this.onLoopStatement(this.program.loopStatement);
		}

		return this.diagnostics;
	}

	protected onLoopStatement(loop: LoopStmt): void {
		for (const statement of loop.body) {
			this.walkStatement(statement);
		}
	}
}
