// ABOUTME: Validates background function values and creates render commands.
// ABOUTME: Keeps background command construction outside the interpreter.

import type { Command } from "../commands.ts";
import type { Token } from "../tokens.ts";
import { requireArgumentNumber } from "./arguments.ts";

export function background({
	values,
	token,
}: {
	values: readonly unknown[];
	token: Token;
}): Command {
	const lightness = requireArgumentNumber(values[0], "lightness", token);
	const chroma = requireArgumentNumber(values[1], "chroma", token);
	const hue = requireArgumentNumber(values[2], "hue", token);

	return {
		type: "background",
		lightness,
		chroma,
		hue,
	};
}
