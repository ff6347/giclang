import type { Token } from "./tokens.ts";

export interface Program {
	// example for program
	// ```gic
	//   let x = 5
	//   ^^^^^
	//   name
	// ```
	type: "Program";
	statements: Statement[];
	loopStatement?: LoopStmt;
}
export type Statement =
	| VarDeclStmt
	| IfStmt
	| Assignment
	| ExprStmt
	| RepeatStmt
	| FuncStmt
	| ReturnStmt;

export interface ReturnStmt {
	type: "ReturnStmt";
	value?: Expression;
}

export interface FuncStmt {
	type: "FuncStmt";
	name: Token;
	params?: Token[];
	body: Statement[];
}

export interface LoopStmt {
	type: "LoopStmt";
	body: Statement[];
}

export interface RepeatStmt {
	type: "RepeatStmt";
	variable: Token;
	start: Expression;
	end: Expression;
	step?: Expression;
	body: Statement[];
}

export interface IfStmt {
	type: "IfStmt";
	condition: Expression;
	thenBranch: Statement[];
	elseBranch?: Statement[];
}

// initializer is the expression after the equals sign
// e.g. `let x = 5` or `let y = 1 + 1`
export interface VarDeclStmt {
	// example for variable declaration statement
	// ```gic
	//   let x = 5
	//   ^^^^^
	//   name
	// ```
	type: "VarDecl";
	name: Token;
	initializer: Expression;
}
export interface ExprStmt {
	// example for expression statement
	// ```gic
	//   5 + 3
	//   ^^^^^
	//   expression
	// ```
	type: "ExprStmt";
	expression: Expression;
}

export interface Assignment {
	// example for assignment expression
	// ```gic
	//   x = 5
	// ```
	type: "Assignment";
	name: Token;
	value: Expression;
}

export type Expression =
	| LiteralExpr
	| LogicalExpr
	| IdentifierExpr
	| UnaryExpr
	| BinaryExpr
	| GroupingExpr
	| CallExpr;

export interface IdentifierExpr {
	// example for identifier expression
	// ```gic
	//   x
	//   ^^^
	//   name
	// ```
	type: "Identifier";
	name: Token;
}

export interface CallExpr {
	// example for call expression
	// ```gic
	//   circle(50, 50, 20)
	//   ^^^^^^
	//   callee
	// ```
	// The whole expression is the Call.
	type: "Call";
	callee: IdentifierExpr;
	arguments: Expression[];
	paren: Token;
}

export interface GroupingExpr {
	// example for grouping expression
	// ```gic
	//   (5 + 3)
	//   ^^^^^^
	//   expression
	// ```
	type: "Grouping";
	expression: Expression;
}
export interface BinaryExpr {
	// example for binary expression
	// ```gic
	//   5 + 3
	//   ^^^
	//   operator
	// ```

	type: "Binary";
	left: Expression;
	operator: Token;
	right: Expression;
}

export interface LogicalExpr {
	// example for logical expression
	// ```gic
	//   true && false
	//   ^^^^
	//   operator
	// ```
	type: "Logical";
	left: Expression;
	operator: Token;
	right: Expression;
}

export interface UnaryExpr {
	// example for unary expression
	// ```gic
	//   !true
	//   ^^^
	//   operator
	// ```
	type: "Unary";
	operator: Token;
	right: Expression;
}
export interface LiteralExpr {
	// example for literal expression
	// ```gic
	//   5
	//   ^^^
	//   literal
	// ```
	type: "Literal";
	value: number | string | boolean;
}
