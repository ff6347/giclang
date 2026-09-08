// ABOUTME: Validates numeric OKLCH fill values and creates fill commands.
// ABOUTME: Keeps fill command construction outside the interpreter.

import type { Command } from "../commands.ts";
import type { Token } from "../tokens.ts";
import { requireArgumentNumber, requireRange } from "./arguments.ts";

export function fill({
	values,
	token,
}: {
	values: readonly unknown[];
	token: Token;
}): Command {
	const lightness = requireArgumentNumber(values[0], "lightness", token);
	const chroma = requireArgumentNumber(values[1], "chroma", token);
	const hue = requireArgumentNumber(values[2], "hue", token);

	requireRange(lightness, "lightness", token, 0, 100);
	requireRange(chroma, "chroma", token, 0, 100);
	requireRange(hue, "hue", token, 0, 360);

	if (values[3] !== undefined) {
		const alpha = requireArgumentNumber(values[3], "alpha", token);
		requireRange(alpha, "alpha", token, 0, 100);
		return {
			type: "fill",
			color: { lightness, chroma, hue, alpha, kind: "oklch" },
		};
	}

	return {
		type: "fill",
		color: { lightness, chroma, hue, kind: "oklch" },
	};
}
