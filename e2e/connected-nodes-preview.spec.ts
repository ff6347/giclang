// ABOUTME: Verifies the connected-nodes example renders with its intended contrast.
// ABOUTME: Reads the shipped example through the real browser preview pipeline.

import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { setEditorSource } from "./editor.ts";

test("renders the connected-nodes example on black with grey strokes", async ({
	page,
}) => {
	const source = await readFile(
		new URL("../examples/connected-nodes.gic", import.meta.url),
		"utf8",
	);
	await page.goto("/");
	await setEditorSource(page, source);

	await expect
		.poll(() =>
			page.locator("#canvas").evaluate((element) => {
				if (!(element instanceof HTMLCanvasElement)) {
					throw new Error("Expected #canvas to be a canvas element.");
				}
				const context = element.getContext("2d");
				if (context === null) {
					throw new Error("Expected a 2D canvas context.");
				}
				const pixels = context.getImageData(
					0,
					0,
					element.width,
					element.height,
				).data;
				let blackPixels = 0;
				let greyPixels = 0;
				for (let index = 0; index < pixels.length; index += 4) {
					const [red, green, blue, alpha] = pixels.slice(index, index + 4);
					if (alpha === 255 && red === 0 && green === 0 && blue === 0) {
						blackPixels += 1;
					}
					if (
						alpha === 255 &&
						red === green &&
						green === blue &&
						red >= 70 &&
						red <= 200
					) {
						greyPixels += 1;
					}
				}
				return {
					hasOpaqueBlackBackground:
						blackPixels > element.width * element.height * 0.05,
					hasGreyStrokes: greyPixels > 0,
				};
			}),
		)
		.toEqual({
			hasOpaqueBlackBackground: true,
			hasGreyStrokes: true,
		});
});
