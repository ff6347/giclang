// ABOUTME: Validates CSS and numeric OKLCH colors and creates fill commands.
// ABOUTME: Keeps fill command construction outside the interpreter.

import type { Command } from "../commands.ts";
import type { Token } from "../tokens.ts";
import { requireColor } from "./color.ts";

export function fill({
	values,
	token,
}: {
	values: readonly unknown[];
	token: Token;
}): Command {
	return {
		type: "fill",
		color: requireColor(values, token),
	};
}
