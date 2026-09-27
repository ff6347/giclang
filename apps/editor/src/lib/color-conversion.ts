// ABOUTME: Converts platform-neutral colors into Canvas-compatible style strings.
// ABOUTME: Supports tagged OKLCH and CSS colors in the browser renderer.

import type { Color } from "@giclang/core";

export function colorToCanvasStyle(color: Color): string {
	if (color.kind === "oklch") {
		if (color.alpha !== undefined) {
			return `oklch(${color.lightness}% ${color.chroma}% ${color.hue % 360} / ${color.alpha}%)`;
		}
		return `oklch(${color.lightness}% ${color.chroma}% ${color.hue % 360})`;
	}
	return color.value;
}
