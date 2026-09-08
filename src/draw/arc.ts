// ABOUTME: Validates arc function values and creates render commands.
// ABOUTME: Keeps arc command construction outside the interpreter.

import type { Command } from "../commands.ts";
import { requireArgumentNumber } from "./arguments.ts";
import type { DrawingInput } from "./drawing-types.ts";

export function arc({ values, token }: DrawingInput): Command {
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
