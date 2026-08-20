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
import { reservedNames } from "./keywords.ts";
import { Scope } from "./scope.ts";
import type { Token } from "./tokens.ts";

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

	missingNameDiagnostic(token: Token): Diagnostic {
		return {
			message: `Cannot find name '${token.lexeme}'.`,
			line: token.line,
			start: token.start,
			end: token.end,
		};
	}
	findDeclaration(name: string) {
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
		statement.body.forEach((stmt) => {
			this.walkStatement(stmt);
		});
	}
	protected onFuncStmt(statement: FuncStmt) {
		if (this.findDeclaration(statement.name.lexeme) !== undefined) {
			this.diagnostics.push({
				message: `Cannot declare '${statement.name.lexeme}' because that name already exists.`,
				line: statement.name.line,
				start: statement.name.start,
				end: statement.name.end,
			});
		}
		this.scopes.at(-1)?.declarations.set(statement.name.lexeme, statement.name);
		this.scopes.push(new Scope());
		if (statement.params) {
			statement.params.forEach((param) => {
				if (this.programGlobalNames.has(param.lexeme)) {
					this.diagnostics.push({
						message: `Cannot declare '${param.lexeme}' because that name already exists.`,
						line: param.line,
						start: param.start,
						end: param.end,
					});
				} else if (this.findDeclaration(param.lexeme) !== undefined) {
					this.diagnostics.push({
						message: `Cannot declare '${param.lexeme}' because that name already exists.`,
						line: param.line,
						start: param.start,
						end: param.end,
					});
				}
				this.scopes.at(-1)?.declarations.set(param.lexeme, param);
			});
		}
		statement.body.forEach((stmt) => {
			this.walkStatement(stmt);
		});
		this.scopes.pop();
	}
	protected onAssignment(statement: Assignment) {
		if (reservedNames.has(statement.name.lexeme)) {
			const diagnostic: Diagnostic = {
				message: `Cannot assign to '${statement.name.lexeme}' because that name is defined by GIC.`,
				line: statement.name.line,
				start: statement.name.start,
				end: statement.name.end,
			};
			this.diagnostics.push(diagnostic);
		} else if (this.findDeclaration(statement.name.lexeme) === undefined) {
			this.diagnostics.push(this.missingNameDiagnostic(statement.name));
		}
		this.walkExpression(statement.value);
	}
	protected onExprStmt(statement: ExprStmt) {
		this.walkExpression(statement.expression);
	}
	protected onVarDecl(statement: VarDeclStmt) {
		this.walkExpression(statement.initializer);
		if (reservedNames.has(statement.name.lexeme)) {
			const diagnostic: Diagnostic = {
				message: `Cannot declare '${statement.name.lexeme}' because that name is defined by GIC.`,
				line: statement.name.line,
				start: statement.name.start,
				end: statement.name.end,
			};
			this.diagnostics.push(diagnostic);
		} else if (
			this.scopes.length > 1 &&
			this.programGlobalNames.has(statement.name.lexeme)
		) {
			const diagnostic: Diagnostic = {
				message: `Cannot declare '${statement.name.lexeme}' because that name already exists.`,
				line: statement.name.line,
				start: statement.name.start,
				end: statement.name.end,
			};
			this.diagnostics.push(diagnostic);
		} else if (this.findDeclaration(statement.name.lexeme) !== undefined) {
			const diagnostic: Diagnostic = {
				message: `Cannot declare '${statement.name.lexeme}' because that name already exists.`,
				line: statement.name.line,
				start: statement.name.start,
				end: statement.name.end,
			};
			this.diagnostics.push(diagnostic);
		} else {
			this.scopes
				.at(-1)
				?.declarations.set(statement.name.lexeme, statement.name);
		}
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
	protected onIdentifier(expr: IdentifierExpr) {
		// leaf: no children to walk
		const known =
			this.findDeclaration(expr.name.lexeme) ||
			reservedNames.has(expr.name.lexeme);
		if (!known) {
			this.diagnostics.push(this.missingNameDiagnostic(expr.name));
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
		for (const statement of loop.body) {
			this.walkStatement(statement);
		}
	}
}
