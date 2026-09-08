// ABOUTME: Validates CSS and numeric OKLCH colors and creates stroke commands.
// ABOUTME: Keeps stroke command construction outside the interpreter.

import type { Command } from "../commands.ts";
import type { Token } from "../tokens.ts";
import { requireColor } from "./color.ts";

export function stroke({
	values,
	token,
}: {
	values: readonly unknown[];
	token: Token;
}): Command {
	return {
		type: "stroke",
		color: requireColor(values, token),
	};
}
