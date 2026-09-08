// ABOUTME: Validates stroke width values and creates stroke-width commands.
// ABOUTME: Keeps stroke-width command construction outside the interpreter.
import type { Command } from "../commands.ts";
import { requireArgumentNumber } from "./arguments.ts";
import type { DrawingInput } from "./drawing-types.ts";

export function strokeWidth({ values, token }: DrawingInput): Command {
	return {
		type: "strokeWidth",
		width: requireArgumentNumber(values[0], "width", token),
	};
}
