// ABOUTME: Validates line function values and creates render commands.
// ABOUTME: Keeps line command construction outside the interpreter.

import type { Command } from "../commands.ts";
import type { DrawingInput } from "./drawing-types.ts";
import { requireArgumentNumber } from "./arguments.ts";

export function line({ values, token }: DrawingInput): Command {
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
