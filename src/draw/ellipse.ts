// ABOUTME: Validates ellipse function values and creates render commands.
// ABOUTME: Keeps ellipse command construction outside the interpreter.

import type { Command } from "../commands.ts";
import { requireArgumentNumber } from "./arguments.ts";
import type { DrawingInput } from "./drawing-types.ts";

export function ellipse({ values, token }: DrawingInput): Command {
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
