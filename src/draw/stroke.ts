// ABOUTME: Validates CSS and numeric OKLCH colors and creates stroke commands.
// ABOUTME: Keeps stroke command construction outside the interpreter.

import type { Command } from "../commands.ts";
import { requireColor } from "./color.ts";
import type { DrawingInput } from "./drawing-types.ts";

export function stroke({ values, token }: DrawingInput): Command {
	return {
		type: "stroke",
		color: requireColor(values, token),
	};
}
