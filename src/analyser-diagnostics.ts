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
