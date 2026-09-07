// ABOUTME: Validates background function values and creates render commands.
// ABOUTME: Keeps background command construction outside the interpreter.

import type { Command } from "../commands.ts";
import type { Token } from "../tokens.ts";
import { requireNumber } from "./arguments.ts";

export function background({
	lightnessValue,
	chromaValue,
	hueValue,
	token,
}: {
	lightnessValue: unknown;
	chromaValue: unknown;
	hueValue: unknown;
	token: Token;
}): Command {
	const lightness = requireNumber(lightnessValue, "lightness", token);
	const chroma = requireNumber(chromaValue, "chroma", token);
	const hue = requireNumber(hueValue, "hue", token);

	return {
		type: "background",
		lightness,
		chroma,
		hue,
	};
}
