// ABOUTME: Validates circle function values and creates render commands.
// ABOUTME: Keeps circle command construction outside the interpreter.

import type { Command } from "../commands.ts";
import type { DrawingInput } from "./drawing-types.ts";
import { requireArgumentNumber } from "./arguments.ts";

export function circle({ values, token }: DrawingInput): Command {
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
