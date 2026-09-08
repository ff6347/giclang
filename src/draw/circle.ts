// ABOUTME: Validates circle function values and creates render commands.
// ABOUTME: Keeps circle command construction outside the interpreter.

import type { Command } from "../commands.ts";
import type { Token } from "../tokens.ts";
import { requireNumber } from "./arguments.ts";

export function circle({
	values,
	token,
}: {
	values: readonly unknown[];
	token: Token;
}): Command {
	const x = requireNumber(values[0], "x", token);
	const y = requireNumber(values[1], "y", token);
	const radius = requireNumber(values[2], "radius", token);

	return {
		type: "circle",
		x,
		y,
		radius,
	};
}
