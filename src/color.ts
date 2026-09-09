// ABOUTME: Validates color-function arguments and creates tagged color values.
// ABOUTME: Supports CSS strings and numeric OKLCH colors with optional alpha.
import type { Color } from "./commands.ts";
import { GicError } from "./error.ts";
import type { Token } from "./tokens.ts";
import {
	requireArgumentNumber,
	requireArgumentString,
	requireRange,
} from "./arguments.ts";
import { colornames } from "./color-names.ts";

export function requireColor(values: readonly unknown[], token: Token): Color {
	if (values.length === 1) {
		const value = requireArgumentString(values[0], "value", token);
		if (
			colornames.has(value.toLowerCase()) ||
			value.match(/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i)
		) {
			return { kind: "css", value };
		}
		throw new GicError(
			`Invalid color: ${value}`,
			token.line,
			token.start,
			token.end,
		);
	}

	if (values.length === 3 || values.length === 4) {
		const lightness = requireArgumentNumber(values[0], "lightness", token);
		const chroma = requireArgumentNumber(values[1], "chroma", token);
		const hue = requireArgumentNumber(values[2], "hue", token);

		requireRange(lightness, "lightness", token, 0, 100);
		requireRange(chroma, "chroma", token, 0, 100);
		requireRange(hue, "hue", token, 0, 360);

		if (values.length === 4) {
			const alpha = requireArgumentNumber(values[3], "alpha", token);
			requireRange(alpha, "alpha", token, 0, 100);
			return { kind: "oklch", lightness, chroma, hue, alpha };
		}

		return { kind: "oklch", lightness, chroma, hue };
	}

	throw new GicError(
		`Invalid color: ${values}`,
		token.line,
		token.start,
		token.end,
	);
}
