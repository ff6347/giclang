// ABOUTME: Validates point function values and creates render commands.
// ABOUTME: Keeps point command construction outside the interpreter.

import type { Command } from "../commands.ts";
import type { DrawingInput } from "./drawing-types.ts";
import { requireArgumentNumber } from "./arguments.ts";

export function point({ values, token }: DrawingInput): Command {
	const x = requireArgumentNumber(values[0], "x", token);
	const y = requireArgumentNumber(values[1], "y", token);

	return {
		type: "point",
		x,
		y,
	};
}
