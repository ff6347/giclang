// ABOUTME: Validates triangle function values and creates render commands.
// ABOUTME: Keeps triangle command construction outside the interpreter.

import type { Command } from "../commands.ts";
import { requireArgumentNumber } from "./arguments.ts";
import type { DrawingInput } from "./drawing-types.ts";

export function triangle({ values, token }: DrawingInput): Command {
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
