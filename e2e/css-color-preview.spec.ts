// ABOUTME: Verifies CSS color commands through the Firefox Canvas preview.
// ABOUTME: Covers named and hexadecimal colors for backgrounds and fills.

import { expect, test } from "@playwright/test";
import { setEditorSource } from "./editor.ts";

test("renders a named CSS background color", async ({ page }) => {
	const source = 'background("tomato");';
	await page.goto("/");
	await setEditorSource(page, source);

	await expect
		.poll(
			() =>
				page.locator("#canvas").evaluate((element) => {
					if (!(element instanceof HTMLCanvasElement)) {
						throw new Error("Expected #canvas to be a canvas element.");
					}
					const context = element.getContext("2d");
					if (context === null) {
						throw new Error("Expected a 2D canvas context.");
					}
					return Array.from(context.getImageData(0, 0, 1, 1).data);
				}),
			{ timeout: 10_000 },
		)
		.toEqual([255, 99, 71, 255]);
});

test("renders named and hexadecimal CSS fill colors in source order", async ({
	page,
}) => {
	const source = `background("#ffffff");
noStroke();
fill("tomato");
circle(25, 50, 10);
fill("#000000");
circle(75, 50, 10);`;
	await page.goto("/");
	await setEditorSource(page, source);

	await expect
		.poll(
			() =>
				page.locator("#canvas").evaluate((element) => {
					if (!(element instanceof HTMLCanvasElement)) {
						throw new Error("Expected #canvas to be a canvas element.");
					}
					const context = element.getContext("2d");
					if (context === null) {
						throw new Error("Expected a 2D canvas context.");
					}
					return {
						background: Array.from(context.getImageData(0, 0, 1, 1).data),
						namedFill: Array.from(context.getImageData(25, 50, 1, 1).data),
						hexFill: Array.from(context.getImageData(75, 50, 1, 1).data),
					};
				}),
			{ timeout: 10_000 },
		)
		.toEqual({
			background: [255, 255, 255, 255],
			namedFill: [255, 99, 71, 255],
			hexFill: [0, 0, 0, 255],
		});
});
