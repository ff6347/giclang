// ABOUTME: Validates evaluated operands used by logical expressions.
// ABOUTME: Produces source-located diagnostics for non-boolean values.

import type { LiteralValue } from "./ast.ts";
import { GicError } from "./error.ts";
import type { Token } from "./tokens.ts";

export function requireBoolean(token: Token, value: LiteralValue): boolean {
	if (typeof value !== "boolean") {
		throw new GicError(
			`Logical operator '${token.lexeme}' requires boolean operands.`,
			token.line,
			token.start,
			token.end,
		);
	}
	return value;
}
