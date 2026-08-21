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
import {
	diagnosticAssignDefinedByGIC,
	diagnosticAssignFunction,
	diagnosticDeclareAlreadyExisting,
	diagnosticDeclareDefinedByGIC,
	missingNameDiagnostic,
} from "./analyser-diagnostics.ts";
import { reservedNames } from "./keywords.ts";
import { Scope, type Declaration } from "./scope.ts";

export class Analyser {
	scopes: Scope[] = [];
	diagnostics: Diagnostic[] = [];
	program: Program;
	programGlobalNames: Set<string> = new Set();
	constructor(program: Program) {
		this.program = program;
		const globalScope = new Scope();
		this.scopes.push(globalScope);
	}

	findDeclaration(name: string): Declaration | undefined {
		for (let i = this.scopes.length - 1; i >= 0; i--) {
			if (this.scopes[i]?.declarations.has(name)) {
				return this.scopes[i]?.declarations.get(name);
			}
		}
		return undefined;
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

		this.scopes.push(new Scope());

		if (reservedNames.has(statement.variable.lexeme)) {
			this.diagnostics.push(diagnosticDeclareDefinedByGIC(statement.variable));
		} else if (this.programGlobalNames.has(statement.variable.lexeme)) {
			this.diagnostics.push(
				diagnosticDeclareAlreadyExisting(statement.variable),
			);
		} else if (this.findDeclaration(statement.variable.lexeme) !== undefined) {
			this.diagnostics.push(
				diagnosticDeclareAlreadyExisting(statement.variable),
			);
		} else {
			this.scopes.at(-1)?.declarations.set(statement.variable.lexeme, {
				kind: "variable",
				token: statement.variable,
			});
		}
		statement.body.forEach((stmt) => {
			this.walkStatement(stmt);
		});
		this.scopes.pop();
	}
	protected onFuncStmt(statement: FuncStmt) {
		if (reservedNames.has(statement.name.lexeme)) {
			this.diagnostics.push(diagnosticDeclareDefinedByGIC(statement.name));
		} else if (this.findDeclaration(statement.name.lexeme) !== undefined) {
			this.diagnostics.push(diagnosticDeclareAlreadyExisting(statement.name));
		}
		this.scopes.at(-1)?.declarations.set(statement.name.lexeme, {
			kind: "function",
			token: statement.name,
		});
		this.scopes.push(new Scope());
		if (statement.params) {
			statement.params.forEach((param) => {
				if (reservedNames.has(param.lexeme)) {
					this.diagnostics.push(diagnosticDeclareDefinedByGIC(param));
				} else if (this.programGlobalNames.has(param.lexeme)) {
					this.diagnostics.push(diagnosticDeclareAlreadyExisting(param));
				} else if (this.findDeclaration(param.lexeme) !== undefined) {
					this.diagnostics.push(diagnosticDeclareAlreadyExisting(param));
				}
				this.scopes.at(-1)?.declarations.set(param.lexeme, {
					kind: "variable",
					token: param,
				});
			});
		}
		statement.body.forEach((stmt) => {
			this.walkStatement(stmt);
		});
		this.scopes.pop();
	}
	protected onAssignment(statement: Assignment) {
		const declaration = this.findDeclaration(statement.name.lexeme);

		if (reservedNames.has(statement.name.lexeme)) {
			const diagnostic: Diagnostic = diagnosticAssignDefinedByGIC(
				statement.name,
			);
			this.diagnostics.push(diagnostic);
		} else if (declaration === undefined) {
			this.diagnostics.push(missingNameDiagnostic(statement.name));
		} else if (declaration.kind === "function") {
			this.diagnostics.push(diagnosticAssignFunction(statement.name));
		}
		this.walkExpression(statement.value);
	}
	protected onExprStmt(statement: ExprStmt) {
		this.walkExpression(statement.expression);
	}
	protected onVarDecl(statement: VarDeclStmt) {
		this.walkExpression(statement.initializer);
		if (reservedNames.has(statement.name.lexeme)) {
			this.diagnostics.push(diagnosticDeclareDefinedByGIC(statement.name));
		} else if (
			this.scopes.length > 1 &&
			this.programGlobalNames.has(statement.name.lexeme)
		) {
			this.diagnostics.push(diagnosticDeclareAlreadyExisting(statement.name));
		} else if (this.findDeclaration(statement.name.lexeme) !== undefined) {
			const diagnostic: Diagnostic = diagnosticDeclareAlreadyExisting(
				statement.name,
			);
			this.diagnostics.push(diagnostic);
		} else {
			this.scopes.at(-1)?.declarations.set(statement.name.lexeme, {
				kind: "variable",
				token: statement.name,
			});
		}
	}

	protected onIfStmt(statement: IfStmt) {
		this.walkExpression(statement.condition);
		this.scopes.push(new Scope());
		for (const thenStatement of statement.thenBranch) {
			this.walkStatement(thenStatement);
		}
		this.scopes.pop();
		if (statement.elseBranch) {
			this.scopes.push(new Scope());
			for (const elseStatement of statement.elseBranch) {
				this.walkStatement(elseStatement);
			}
			this.scopes.pop();
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
	protected onIdentifier(expr: IdentifierExpr) {
		// leaf: no children to walk
		const known =
			this.findDeclaration(expr.name.lexeme) ||
			reservedNames.has(expr.name.lexeme);
		if (!known) {
			this.diagnostics.push(missingNameDiagnostic(expr.name));
		}
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
			if (statement.type === "FuncStmt" || statement.type === "VarDecl") {
				this.programGlobalNames.add(statement.name.lexeme);
			}
		}
		for (const statement of this.program.statements) {
			this.walkStatement(statement);
		}
		if (this.program.loopStatement) {
			this.onLoopStatement(this.program.loopStatement);
		}

		return this.diagnostics;
	}

	protected onLoopStatement(loop: LoopStmt): void {
		this.scopes.push(new Scope());
		for (const statement of loop.body) {
			this.walkStatement(statement);
		}
		this.scopes.pop();
	}
}
