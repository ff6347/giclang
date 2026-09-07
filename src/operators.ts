// ABOUTME: Applies unary and binary operators to evaluated GIC runtime values.
// ABOUTME: Enforces operand types and reports source-located operator errors.

import type { LiteralValue } from "./ast.ts";
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
	token: Token,
	left: LiteralValue,
	right: LiteralValue,
): LiteralValue {
	switch (token.type) {
		case "BANG_EQUAL":
			return left !== right;

		case "EQUAL_EQUAL":
			return left === right;

		case "MODULO": {
			const [leftNumber, rightNumber] = requireNumbers(
				token,
				left,
				right,
				`Cannot perform modulo on non-number values.`,
			);
			if (rightNumber === 0) {
				throw new GicError(
					`Cannot calculate modulo by zero.`,
					token.line,
					token.start,
					token.end,
				);
			}
			return leftNumber % rightNumber;
		}

		case "LESS": {
			const [leftNumber, rightNumber] = requireNumbers(
				token,
				left,
				right,
				`Cannot compare non-number values.`,
			);
			return leftNumber < rightNumber;
		}

		case "LESS_EQUAL": {
			const [leftNumber, rightNumber] = requireNumbers(
				token,
				left,
				right,
				`Cannot compare non-number values.`,
			);
			return leftNumber <= rightNumber;
		}

		case "GREATER": {
			const [leftNumber, rightNumber] = requireNumbers(
				token,
				left,
				right,
				`Cannot compare non-number values.`,
			);
			return leftNumber > rightNumber;
		}

		case "GREATER_EQUAL": {
			const [leftNumber, rightNumber] = requireNumbers(
				token,
				left,
				right,
				`Cannot compare non-number values.`,
			);
			return leftNumber >= rightNumber;
		}

		case "PLUS":
			if (typeof left === "number" && typeof right === "number") {
				return left + right;
			} else if (typeof left === "string" && typeof right === "string") {
				return left + right;
			} else {
				throw new GicError(
					`Cannot add values unless both are numbers or both are strings.`,
					token.line,
					token.start,
					token.end,
				);
			}
		case "MINUS": {
			const [leftNumber, rightNumber] = requireNumbers(
				token,
				left,
				right,
				`Cannot perform subtraction on non-number values.`,
			);
			return leftNumber - rightNumber;
		}
		case "STAR": {
			const [leftNumber, rightNumber] = requireNumbers(
				token,
				left,
				right,
				`Cannot perform multiplication on non-number values.`,
			);
			return leftNumber * rightNumber;
		}
		case "SLASH": {
			const [leftNumber, rightNumber] = requireNumbers(
				token,
				left,
				right,
				`Cannot perform division on non-number values.`,
			);
			if (rightNumber === 0) {
				throw new GicError(
					`Cannot divide by zero.`,
					token.line,
					token.start,
					token.end,
				);
			}

			return leftNumber / rightNumber;
		}
		default:
			throw new Error(`Unknown operator: ${token.lexeme}`);
	}
}

function requireNumbers(
	token: Token,
	left: LiteralValue,
	right: LiteralValue,
	message: string,
): [number, number] {
	if (typeof left !== "number" || typeof right !== "number") {
		throw new GicError(message, token.line, token.start, token.end);
	}
	return [left, right];
}
