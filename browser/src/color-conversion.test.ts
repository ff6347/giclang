// ABOUTME: Verifies browser color conversion for Canvas-compatible style strings.
// ABOUTME: Covers GIC percentage alpha values in tagged OKLCH colors.
/// <reference types="node" />

import assert from "node:assert";
import test, { describe } from "node:test";
import { colorToCanvasStyle } from "./color-conversion.ts";

describe("Canvas color conversion", () => {
	test("should convert OKLCH alpha to a percentage", () => {
		const actual = colorToCanvasStyle({
			kind: "oklch",
			lightness: 70,
			chroma: 50,
			hue: 200,
			alpha: 50,
		});

		assert.strictEqual(actual, "oklch(70% 50% 200 / 50%)");
	});
});
