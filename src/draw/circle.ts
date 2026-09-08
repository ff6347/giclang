// ABOUTME: Validates circle function values and creates render commands.
// ABOUTME: Keeps circle command construction outside the interpreter.

import type { Command } from "../commands.ts";
import type { Token } from "../tokens.ts";
import { requireArgumentNumber } from "./arguments.ts";

export function circle({
	values,
	token,
}: {
	values: readonly unknown[];
	token: Token;
}): Command {
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
