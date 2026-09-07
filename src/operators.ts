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
		case "BANG_EQUAL":
			return left !== right;

		case "EQUAL_EQUAL":
			return left === right;

		case "MODULO":
			if (typeof left === "number" && typeof right === "number") {
				if (right === 0) {
					throw new GicError(
						`Cannot calculate modulo by zero.`,
						expr.operator.line,
						expr.operator.start,
						expr.operator.end,
					);
				}
				return left % right;
			}
			throw new GicError(
				`Cannot perform modulo on non-number values.`,
				expr.operator.line,
				expr.operator.start,
				expr.operator.end,
			);

		case "LESS":
			if (typeof left !== "number" || typeof right !== "number") {
				throw new GicError(
					`Cannot compare non-number values.`,
					expr.operator.line,
					expr.operator.start,
					expr.operator.end,
				);
			}
			return left < right;

		case "LESS_EQUAL":
			if (typeof left !== "number" || typeof right !== "number") {
				throw new GicError(
					`Cannot compare non-number values.`,
					expr.operator.line,
					expr.operator.start,
					expr.operator.end,
				);
			}
			return left <= right;

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

		case "GREATER_EQUAL":
			if (typeof left !== "number" || typeof right !== "number") {
				throw new GicError(
					`Cannot compare non-number values.`,
					expr.operator.line,
					expr.operator.start,
					expr.operator.end,
				);
			}
			return left >= right;

		case "PLUS":
			if (typeof left === "number" && typeof right === "number") {
				return left + right;
			} else if (typeof left === "string" && typeof right === "string") {
				return left + right;
			} else {
				throw new GicError(
					`Cannot add values unless both are numbers or both are strings.`,
					expr.operator.line,
					expr.operator.start,
					expr.operator.end,
				);
			}
		case "MINUS":
			if (typeof left !== "number" || typeof right !== "number") {
				throw new GicError(
					`Cannot perform subtraction on non-number values.`,
					expr.operator.line,
					expr.operator.start,
					expr.operator.end,
				);
			}
			return left - right;
		case "STAR":
			if (typeof left !== "number" || typeof right !== "number") {
				throw new GicError(
					`Cannot perform multiplication on non-number values.`,
					expr.operator.line,
					expr.operator.start,
					expr.operator.end,
				);
			}
			return left * right;
		case "SLASH":
			if (typeof left !== "number" || typeof right !== "number") {
				throw new GicError(
					`Cannot perform division on non-number values.`,
					expr.operator.line,
					expr.operator.start,
					expr.operator.end,
				);
			}
			if (right === 0) {
				throw new GicError(
					`Cannot divide by zero.`,
					expr.operator.line,
					expr.operator.start,
					expr.operator.end,
				);
			}

			return left / right;
		default:
			throw new Error(`Unknown operator: ${expr.operator.lexeme}`);
	}
}
