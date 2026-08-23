// ABOUTME: Builds semantic diagnostics for declaration and assignment name errors.
// ABOUTME: Keeps analyzer message wording and source locations consistent.
import type { Diagnostic } from "./core.ts";
import type { Token } from "./tokens.ts";

export function diagnosticAssignFunction(token: Token): Diagnostic {
	return {
		message: `Cannot assign to function '${token.lexeme}'.`,
		line: token.line,
		start: token.start,
		end: token.end,
	};
}
export function diagnosticDeclareAlreadyExisting(token: Token): Diagnostic {
	return {
		message: `Cannot declare '${token.lexeme}' because that name already exists.`,
		line: token.line,
		start: token.start,
		end: token.end,
	};
}

export function diagnosticAssignDefinedByGIC(token: Token): Diagnostic {
	return {
		message: `Cannot assign to '${token.lexeme}' because that name is defined by GIC.`,
		line: token.line,
		start: token.start,
		end: token.end,
	};
}

export function diagnosticDeclareDefinedByGIC(token: Token): Diagnostic {
	return {
		message: `Cannot declare '${token.lexeme}' because that name is defined by GIC.`,
		line: token.line,
		start: token.start,
		end: token.end,
	};
}

export function missingNameDiagnostic(token: Token): Diagnostic {
	return {
		message: `Cannot find name '${token.lexeme}'.`,
		line: token.line,
		start: token.start,
		end: token.end,
	};
}

export function notAFunctionDiagnostic(name: Token): Diagnostic {
	return {
		message: `Cannot call '${name.lexeme}' because it is not a function.`,
		line: name.line,
		start: name.start,
		end: name.end,
	};
}

export function arityMismatchDiagnostic(
	name: Token,
	expected: number,
	actual: number,
): Diagnostic {
	return {
		message: `Function '${name.lexeme}' expects ${expected} arguments, but got ${actual}.`,
		line: name.line,
		start: name.start,
		end: name.end,
	};
}

export function diagnosticFunctionReturn(name: Token): Diagnostic {
	return {
		message: `Function '${name.lexeme}' must have a return statement.`,
		line: name.line,
		start: name.start,
		end: name.end,
	};
}

export function diagnosticFunctionReturnMixed(name: Token): Diagnostic {
	return {
		message: `Function '${name.lexeme}' cannot return both a value and no value.`,
		line: name.line,
		start: name.start,
		end: name.end,
	};
}

export function diagnosticReturnOutsideFunction(keyword: Token): Diagnostic {
	return {
		message: "Cannot return outside a function.",
		line: keyword.line,
		start: keyword.start,
		end: keyword.end,
	};
}

export function diagnosticVoidCallInExpression(token: Token): Diagnostic {
	return {
		message: `Function '${token.lexeme}' does not return a value and cannot be used in an expression.`,
		line: token.line,
		start: token.start,
		end: token.end,
	};
}
