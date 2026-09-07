// ABOUTME: Applies unary and binary operators to evaluated GIC runtime values.
// ABOUTME: Enforces operand types and reports source-located operator errors.

import type { BinaryExpr, LiteralValue } from "./ast.ts";
import { GicError } from "./error.ts";
import type { Token } from "./tokens.ts";

export function applyUnaryOperation(
	token: Token,
	value: string | number | boolean,
): LiteralValue {
	switch (token.type) {
		case "MINUS":
			if (typeof value !== "number") {
				throw new GicError(
					`Cannot perform unary operation on non-number value.`,
					token.line,
					token.start,
					token.end,
				);
			}
			return -value;
		case "BANG":
			if (typeof value !== "boolean") {
				throw new GicError(
					`Cannot perform unary operation on non-boolean value.`,
					token.line,
					token.start,
					token.end,
				);
			}
			return !value;

		default:
			throw new Error(`Unknown unary operation: ${token.lexeme}`);
	}
}

export function applyBinaryOperation(
	expr: BinaryExpr,
	left: LiteralValue,
	right: LiteralValue,
): LiteralValue {
	switch (expr.operator.type) {
		case "GREATER":
			if (typeof left !== "number" || typeof right !== "number") {
				throw new GicError(
					`Cannot compare non-number values.`,
					expr.operator.line,
					expr.operator.start,
					expr.operator.end,
				);
			}
			return left > right;
		// case "PLUS":
		// return left + right;
		// case "MINUS":
		// return left - right;
		case "STAR":
			if (typeof left !== "number" || typeof right !== "number") {
				throw new GicError(
					`Cannot perform multiplication on non-number values`,
					expr.operator.line,
					expr.operator.start,
					expr.operator.end,
				);
			}
			return left * right;
		// case "SLASH":
		// return left / right;
		default:
			throw new Error(`Unknown operator: ${expr.operator.lexeme}`);
	}
}
