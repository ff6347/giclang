// ABOUTME: Validates stroke width values and creates stroke-width commands.
// ABOUTME: Keeps stroke-width command construction outside the interpreter.
import type { Command } from "../commands.ts";
import type { Token } from "../tokens.ts";
import { requireArgumentNumber } from "./arguments.ts";

export function strokeWidth({
	values,
	token,
}: {
	values: readonly unknown[];
	token: Token;
}): Command {
	return {
		type: "strokeWidth",
		width: requireArgumentNumber(values[0], "width", token),
	};
}
