// ABOUTME: Validates circle function values and creates render commands.
// ABOUTME: Keeps circle command construction outside the interpreter.

import type { Command } from "../commands.ts";
import type { Token } from "../tokens.ts";
import { requireNumber } from "./arguments.ts";

export function circle({
	xValue,
	yValue,
	radiusValue,
	token,
}: {
	xValue: unknown;
	yValue: unknown;
	radiusValue: unknown;
	token: Token;
}): Command {
	const x = requireNumber(xValue, "x", token);
	const y = requireNumber(yValue, "y", token);
	const radius = requireNumber(radiusValue, "radius", token);

	return {
		type: "circle",
		x,
		y,
		radius,
	};
}
