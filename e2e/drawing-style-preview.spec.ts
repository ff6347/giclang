// ABOUTME: Verifies ordered drawing-style commands through the Firefox preview.
// ABOUTME: Covers fill toggles, stroke colors, stroke width, alpha, and defaults.

import { expect, test } from "@playwright/test";
import { setEditorSource } from "./editor.ts";

test("disables fill until a later fill command re-enables it", async ({
	page,
}) => {
	const source = `background("#ffffff");
noStroke();
fill("#000000");
circle(20, 50, 10);
noFill();
circle(50, 50, 10);
fill("tomato");
circle(80, 50, 10);`;
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
				return {
					beforeNoFill: Array.from(context.getImageData(20, 50, 1, 1).data),
					whileFillDisabled: Array.from(
						context.getImageData(50, 50, 1, 1).data,
					),
					afterFill: Array.from(context.getImageData(80, 50, 1, 1).data),
				};
			}),
		)
		.toEqual({
			beforeNoFill: [0, 0, 0, 255],
			whileFillDisabled: [255, 255, 255, 255],
			afterFill: [255, 99, 71, 255],
		});
});

test("applies CSS stroke commands around noStroke in source order", async ({
	page,
}) => {
	const source = `background("#ffffff");
noFill();
strokeWidth(4);
stroke("tomato");
circle(20, 50, 10);
noStroke();
circle(50, 50, 10);
stroke("#000000");
circle(80, 50, 10);`;
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
				return {
					namedStroke: Array.from(context.getImageData(29, 50, 1, 1).data),
					disabledStroke: Array.from(context.getImageData(59, 50, 1, 1).data),
					hexStroke: Array.from(context.getImageData(89, 50, 1, 1).data),
					leftCenter: Array.from(context.getImageData(20, 50, 1, 1).data),
				};
			}),
		)
		.toEqual({
			namedStroke: [255, 99, 71, 255],
			disabledStroke: [255, 255, 255, 255],
			hexStroke: [0, 0, 0, 255],
			leftCenter: [255, 255, 255, 255],
		});
});

test("renders numeric stroke alpha", async ({ page }) => {
	const source = `noFill();
stroke(0, 0, 0, 50);
strokeWidth(4);
circle(50, 50, 20);`;
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
				return {
					centerAlpha: context.getImageData(50, 50, 1, 1).data[3],
					strokeAlpha: context.getImageData(69, 50, 1, 1).data[3],
				};
			}),
		)
		.toEqual({
			centerAlpha: 0,
			strokeAlpha: 128,
		});
});

test("applies strokeWidth to subsequent circles", async ({ page }) => {
	const source = `background("#ffffff");
noFill();
stroke("#000000");
strokeWidth(10);
circle(50, 50, 15);`;
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
				const wideStroke = context.getImageData(69, 50, 1, 1).data;
				const outsideStroke = context.getImageData(72, 50, 1, 1).data;
				return {
					wideStrokeVisible: [0, 1, 2].some(
						(index) => wideStroke[index] !== outsideStroke[index],
					),
					outsideStroke: Array.from(outsideStroke),
				};
			}),
		)
		.toEqual({
			wideStrokeVisible: true,
			outsideStroke: [255, 255, 255, 255],
		});
});

test("restores default styles for each preview render", async ({ page }) => {
	const styledSource = `background("#ffffff");
fill("tomato");
noFill();
noStroke();
circle(50, 50, 20);`;
	const defaultSource = `background("#000000");
circle(50, 50, 20);`;
	await page.goto("/");

	await setEditorSource(page, styledSource);
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
				return Array.from(context.getImageData(50, 50, 1, 1).data);
			}),
		)
		.toEqual([255, 255, 255, 255]);

	await setEditorSource(page, defaultSource);
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
				return {
					background: Array.from(context.getImageData(0, 0, 1, 1).data),
					circleCenter: Array.from(context.getImageData(50, 50, 1, 1).data),
				};
			}),
		)
		.toEqual({
			background: [0, 0, 0, 255],
			circleCenter: [255, 255, 255, 255],
		});
});
