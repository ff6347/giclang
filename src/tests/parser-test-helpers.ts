import type { Expression, Program, Statement } from "../ast.ts";

function simplifyExpression(expression: Expression): unknown {
	if (expression.type === "Identifier") {
		return {
			type: expression.type,
			name: expression.name.lexeme,
		};
	}

	if (expression.type === "Literal") {
		return expression;
	}

	if (expression.type === "Binary") {
		return {
			type: expression.type,
			left: simplifyExpression(expression.left),
			operator: expression.operator.lexeme,
			right: simplifyExpression(expression.right),
		};
	}
	if (expression.type === "Unary") {
		return {
			type: expression.type,
			operator: expression.operator.lexeme,
			right: simplifyExpression(expression.right),
		};
	}
	if (expression.type === "Grouping") {
		return {
			type: expression.type,
			expression: simplifyExpression(expression.expression),
		};
	}
	if (expression.type === "Call") {
		return {
			type: expression.type,
			callee: simplifyExpression(expression.callee),
			arguments: expression.arguments.map((argument) =>
				simplifyExpression(argument),
			),
			paren: expression.paren.lexeme,
		};
	}
	if (expression.type === "Logical") {
		return {
			type: expression.type,
			left: simplifyExpression(expression.left),
			operator: expression.operator.lexeme,
			right: simplifyExpression(expression.right),
		};
	}

	return expression;
}


function simplifyStatement(statement: Statement): unknown {
	if (statement.type === "VarDecl") {
		return {
			type: statement.type,
			name: statement.name.lexeme,
			initializer: simplifyExpression(statement.initializer),
		};
	}
	if (statement.type === "Assignment") {
		return {
			type: statement.type,
			name: statement.name.lexeme,
			value: simplifyExpression(statement.value),
		};
	}

	if (statement.type === "ExprStmt") {
		return {
			type: statement.type,
			expression: simplifyExpression(statement.expression),
		};
	}
	if (statement.type === "IfStmt") {
		const simplified = {
			type: statement.type,
			condition: simplifyExpression(statement.condition),
			thenBranch: statement.thenBranch.map(simplifyStatement),
		};

		if (statement.elseBranch !== undefined) {
			return {
				...simplified,
				elseBranch: statement.elseBranch.map(simplifyStatement),
			};
		}
		return simplified;
	}

	return statement;
}


export function simplifyProgram(program: Program) {
	return {
		type: program.type,
		statements: program.statements.map(simplifyStatement),
	};
}
