// ABOUTME: Builds platform-neutral drawing commands from evaluated GIC calls.
// ABOUTME: Validates drawing arguments and exposes the drawing-call registry.

import type { BuiltInKeys } from "./built-ins.ts";
import type { CallableInput, DrawingCall } from "./callable-registry.ts";
import { colornames } from "./color-names.ts";
import type { Command, Color } from "./commands.ts";
import { GicError } from "./error.ts";
import type { Token } from "./tokens.ts";

export function arc({ values, token }: CallableInput): Command {
	const x = requireArgumentNumber(values[0], "x", token);
	const y = requireArgumentNumber(values[1], "y", token);
	const radius = requireArgumentNumber(values[2], "radius", token);
	const startAngle = requireArgumentNumber(values[3], "startAngle", token);
	const endAngle = requireArgumentNumber(values[4], "endAngle", token);

	return {
		type: "arc",
		x,
		y,
		radius,
		startAngle,
		endAngle,
	};
}

export function background({ values, token }: CallableInput): Command {
	return {
		type: "background",
		color: requireColor(values, token),
	};
}

export function circle({ values, token }: CallableInput): Command {
	const x = requireArgumentNumber(values[0], "x", token);
	const y = requireArgumentNumber(values[1], "y", token);
	const radius = requireArgumentNumber(values[2], "radius", token);

	return {
		type: "circle",
		x,
		y,
		radius,
	};
}

/**
 * Parses and validates color arguments as a named or hexadecimal CSS color,
 * or as an OKLCH color with optional alpha.
 */
export function requireColor(values: readonly unknown[], token: Token): Color {
	if (values.length === 1) {
		const value = requireArgumentString(values[0], "value", token);
		if (
			colornames.has(value.toLowerCase()) ||
			value.match(/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i)
		) {
			return { kind: "css", value };
		}
		throw new GicError(
			`Invalid color: ${value}`,
			token.line,
			token.start,
			token.end,
		);
	}

	if (values.length === 3 || values.length === 4) {
		const lightness = requireArgumentNumber(values[0], "lightness", token);
		const chroma = requireArgumentNumber(values[1], "chroma", token);
		const hue = requireArgumentNumber(values[2], "hue", token);

		requireRange(lightness, "lightness", token, 0, 100);
		requireRange(chroma, "chroma", token, 0, 100);
		requireRange(hue, "hue", token, 0, 360);

		if (values.length === 4) {
			const alpha = requireArgumentNumber(values[3], "alpha", token);
			requireRange(alpha, "alpha", token, 0, 100);
			return { kind: "oklch", lightness, chroma, hue, alpha };
		}

		return { kind: "oklch", lightness, chroma, hue };
	}

	throw new GicError(
		`Invalid color: ${values}`,
		token.line,
		token.start,
		token.end,
	);
}

export function ellipse({ values, token }: CallableInput): Command {
	const x = requireArgumentNumber(values[0], "x", token);
	const y = requireArgumentNumber(values[1], "y", token);
	const width = requireArgumentNumber(values[2], "width", token);
	const height = requireArgumentNumber(values[3], "height", token);

	return {
		type: "ellipse",
		x,
		y,
		width,
		height,
	};
}

export function fill({ values, token }: CallableInput): Command {
	return {
		type: "fill",
		color: requireColor(values, token),
	};
}

export function line({ values, token }: CallableInput): Command {
	const x1 = requireArgumentNumber(values[0], "x1", token);
	const y1 = requireArgumentNumber(values[1], "y1", token);
	const x2 = requireArgumentNumber(values[2], "x2", token);
	const y2 = requireArgumentNumber(values[3], "y2", token);

	return {
		type: "line",
		x1,
		y1,
		x2,
		y2,
	};
}

export function noFill(): Command {
	return {
		type: "noFill",
	};
}

export function noStroke(): Command {
	return {
		type: "noStroke",
	};
}

export function point({ values, token }: CallableInput): Command {
	const x = requireArgumentNumber(values[0], "x", token);
	const y = requireArgumentNumber(values[1], "y", token);

	return {
		type: "point",
		x,
		y,
	};
}

export function quad({ values, token }: CallableInput): Command {
	const x1 = requireArgumentNumber(values[0], "x1", token);
	const y1 = requireArgumentNumber(values[1], "y1", token);
	const x2 = requireArgumentNumber(values[2], "x2", token);
	const y2 = requireArgumentNumber(values[3], "y2", token);
	const x3 = requireArgumentNumber(values[4], "x3", token);
	const y3 = requireArgumentNumber(values[5], "y3", token);
	const x4 = requireArgumentNumber(values[6], "x4", token);
	const y4 = requireArgumentNumber(values[7], "y4", token);

	return {
		type: "quad",
		x1,
		y1,
		x2,
		y2,
		x3,
		y3,
		x4,
		y4,
	};
}

export function rect({ values, token }: CallableInput): Command {
	const x = requireArgumentNumber(values[0], "x", token);
	const y = requireArgumentNumber(values[1], "y", token);
	const width = requireArgumentNumber(values[2], "width", token);
	const height = requireArgumentNumber(values[3], "height", token);

	return {
		type: "rect",
		x,
		y,
		width,
		height,
	};
}

export function strokeWidth({ values, token }: CallableInput): Command {
	return {
		type: "strokeWidth",
		width: requireArgumentNumber(values[0], "width", token),
	};
}

export function stroke({ values, token }: CallableInput): Command {
	return {
		type: "stroke",
		color: requireColor(values, token),
	};
}

export function triangle({ values, token }: CallableInput): Command {
	const x1 = requireArgumentNumber(values[0], "x1", token);
	const y1 = requireArgumentNumber(values[1], "y1", token);
	const x2 = requireArgumentNumber(values[2], "x2", token);
	const y2 = requireArgumentNumber(values[3], "y2", token);
	const x3 = requireArgumentNumber(values[4], "x3", token);
	const y3 = requireArgumentNumber(values[5], "y3", token);

	return {
		type: "triangle",
		x1,
		y1,
		x2,
		y2,
		x3,
		y3,
	};
}

export function requireArgumentString(
	value: unknown,
	argumentName: string,
	callee: Token,
): string {
	if (typeof value !== "string") {
		throw new GicError(
			`Function '${callee.lexeme}' requires a string for argument '${argumentName}'.`,
			callee.line,
			callee.start,
			callee.end,
		);
	}
	return value;
}

export function requireArgumentNumber(
	value: unknown,
	argumentName: string,
	callee: Token,
): number {
	if (typeof value !== "number") {
		throw new GicError(
			`Function '${callee.lexeme}' requires a number for argument '${argumentName}'.`,
			callee.line,
			callee.start,
			callee.end,
		);
	}
	return value;
}

export function requireRange(
	value: number,
	argumentName: string,
	callee: Token,
	min: number,
	max: number,
): number {
	if (value < min || value > max || !Number.isFinite(value)) {
		throw new GicError(
			`Function '${callee.lexeme}' requires argument '${argumentName}' to be between ${min} and ${max}.`,
			callee.line,
			callee.start,
			callee.end,
		);
	}
	return value;
}

export const drawingCalls: Partial<Record<BuiltInKeys, DrawingCall>> = {
	background,
	fill,
	noFill,
	noStroke,
	stroke,
	strokeWidth,
	point,
	line,
	arc,
	ellipse,
	circle,
	rect,
	quad,
	triangle,
};
