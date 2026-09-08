// ABOUTME: Validates background function values and creates render commands.
// ABOUTME: Keeps background command construction outside the interpreter.

import type { Command } from "../commands.ts";
import { requireColor } from "./color.ts";
import type { DrawingInput } from "./drawing-types.ts";

export function background({ values, token }: DrawingInput): Command {
	return {
		type: "background",
		color: requireColor(values, token),
	};
}
