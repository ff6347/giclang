// ABOUTME: Test harness that parses GIC source and runs the Analyser on it.
// ABOUTME: Provides a counting TestAnalyser subclass for traversal-coverage assertions.
import { Analyser } from "../analyzer.ts";
import type {
	Assignment,
	BinaryExpr,
	CallExpr,
	ExprStmt,
	FuncStmt,
	GroupingExpr,
	IdentifierExpr,
	IfStmt,
	LiteralExpr,
	LogicalExpr,
	LoopStmt,
	Program,
	RepeatStmt,
	ReturnStmt,
	UnaryExpr,
	VarDeclStmt,
} from "../ast.ts";
import type { Diagnostic } from "../core.ts";
import { Lexer } from "../lexer.ts";
import { Parser } from "../parser.ts";

export class TestAnalyser extends Analyser {
	visits: Map<string, number> = new Map();
	constructor(program: Program) {
		super(program);
	}
	visited(kind: string) {
		this.visits.set(kind, (this.visits.get(kind) ?? 0) + 1);
	}

	override onUnary(expr: UnaryExpr) {
		this.visited(expr.type);
		super.onUnary(expr);
	}
	override onGrouping(expr: GroupingExpr) {
		this.visited(expr.type);
		super.onGrouping(expr);
	}
	override onBinary(expr: BinaryExpr) {
		this.visited(expr.type);
		super.onBinary(expr);
	}
	override onLoopStatement(loop: LoopStmt) {
		this.visited(loop.type);
		super.onLoopStatement(loop);
	}
	override onCall(expr: CallExpr, valueRequired = true) {
		this.visited(expr.type);
		super.onCall(expr, valueRequired);
	}
	override onLiteral(expr: LiteralExpr) {
		this.visited(expr.type);
		super.onLiteral(expr);
	}
	override onIdentifier(expr: IdentifierExpr) {
		this.visited(expr.type);
		super.onIdentifier(expr);
	}
	override onLogical(expr: LogicalExpr) {
		this.visited(expr.type);
		super.onLogical(expr);
	}

	override onAssignment(statement: Assignment): void {
		this.visited(statement.type);
		super.onAssignment(statement);
	}
	override onExprStmt(statement: ExprStmt): void {
		this.visited(statement.type);
		super.onExprStmt(statement);
	}
	override onIfStmt(statement: IfStmt): void {
		this.visited(statement.type);
		super.onIfStmt(statement);
	}
	override onFuncStmt(statement: FuncStmt): void {
		this.visited(statement.type);
		super.onFuncStmt(statement);
	}

	override onReturnStmt(statement: ReturnStmt): void {
		this.visited(statement.type);
		super.onReturnStmt(statement);
	}
	override onRepeatStmt(statement: RepeatStmt): void {
		this.visited(statement.type);
		super.onRepeatStmt(statement);
	}
	override onVarDecl(statement: VarDeclStmt): void {
		this.visited(statement.type);
		super.onVarDecl(statement);
	}
}

export function analyseSource(source: string): {
	diagnostics: Diagnostic[];
	analyzer: TestAnalyser;
} {
	const lexer = new Lexer(source);
	const tokens = lexer.scanTokens();
	const parser = new Parser(tokens);
	const program = parser.parse();
	const analyzer = new TestAnalyser(program);
	const diagnostics = analyzer.analyze();
	return { diagnostics, analyzer };
}
