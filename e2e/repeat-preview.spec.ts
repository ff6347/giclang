// ABOUTME: Verifies repeat drawings and diagnostics through the Firefox preview.
// ABOUTME: Covers repeated rows, nested grids, and invalid repeat execution.

import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { setEditorSource } from "./editor.ts";

test("renders a repeated row of circles", async ({ page }) => {
	const source = `background(100, 0, 0);
fill(0, 0, 0);
noStroke();
repeat(column, 0, 3) {
	circle(20 + column * 30, 50, 8);
}`;
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
				const background = context.getImageData(0, 0, 1, 1).data;
				const differsFromBackground = (x: number, y: number) => {
					const pixel = context.getImageData(x, y, 1, 1).data;
					return [0, 1, 2].some((index) => pixel[index] !== background[index]);
				};
				return {
					backgroundOpaque: background[3] === 255,
					leftCircleVisible: differsFromBackground(20, 50),
					middleCircleVisible: differsFromBackground(50, 50),
					rightCircleVisible: differsFromBackground(80, 50),
					gapAfterLeftClear: !differsFromBackground(35, 50),
					gapAfterMiddleClear: !differsFromBackground(65, 50),
				};
			}),
		)
		.toEqual({
			backgroundOpaque: true,
			leftCircleVisible: true,
			middleCircleVisible: true,
			rightCircleVisible: true,
			gapAfterLeftClear: true,
			gapAfterMiddleClear: true,
		});
});

test("renders a grid from nested repeats", async ({ page }) => {
	const source = `background(100, 0, 0);
fill(0, 0, 0);
noStroke();
repeat(row, 0, 2) {
	repeat(column, 0, 2) {
		circle(25 + column * 50, 25 + row * 50, 8);
	}
}`;
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
				const background = context.getImageData(0, 0, 1, 1).data;
				const differsFromBackground = (x: number, y: number) => {
					const pixel = context.getImageData(x, y, 1, 1).data;
					return [0, 1, 2].some((index) => pixel[index] !== background[index]);
				};
				return {
					backgroundOpaque: background[3] === 255,
					topLeftCircleVisible: differsFromBackground(25, 25),
					topRightCircleVisible: differsFromBackground(75, 25),
					bottomLeftCircleVisible: differsFromBackground(25, 75),
					bottomRightCircleVisible: differsFromBackground(75, 75),
					centerClear: !differsFromBackground(50, 50),
				};
			}),
		)
		.toEqual({
			backgroundOpaque: true,
			topLeftCircleVisible: true,
			topRightCircleVisible: true,
			bottomLeftCircleVisible: true,
			bottomRightCircleVisible: true,
			centerClear: true,
		});
});

test("clears repeated output and reports a zero repeat step", async ({
	page,
}) => {
	const validSource = `background(100, 0, 0);
fill(0, 0, 0);
noStroke();
repeat(column, 0, 3) {
	circle(20 + column * 30, 50, 8);
}`;
	const invalidSource = `repeat(column, 0, 3, 0) {
	circle(20 + column * 30, 50, 8);
}`;
	await page.goto("/");
	const sampleCanvas = () =>
		page.locator("#canvas").evaluate((element) => {
			if (!(element instanceof HTMLCanvasElement)) {
				throw new Error("Expected #canvas to be a canvas element.");
			}
			const context = element.getContext("2d");
			if (context === null) {
				throw new Error("Expected a 2D canvas context.");
			}
			const corner = context.getImageData(0, 0, 1, 1).data;
			const circleCenter = context.getImageData(20, 50, 1, 1).data;
			return {
				cornerOpaque: corner[3] === 255,
				circleCenterOpaque: circleCenter[3] === 255,
				circleDiffersFromCorner: [0, 1, 2].some(
					(index) => circleCenter[index] !== corner[index],
				),
			};
		});

	await setEditorSource(page, validSource);
	await expect.poll(sampleCanvas).toEqual({
		cornerOpaque: true,
		circleCenterOpaque: true,
		circleDiffersFromCorner: true,
	});

	await setEditorSource(page, invalidSource);
	await expect.poll(sampleCanvas).toEqual({
		cornerOpaque: false,
		circleCenterOpaque: false,
		circleDiffersFromCorner: false,
	});
	await expect(page.locator("#problems")).toContainText(
		"Repeat step cannot be zero.",
	);
});

test("renders the deterministic repeat example fixture", async ({ page }) => {
	const source = await readFile(
		new URL("../content/examples/repeat/repeat.gic", import.meta.url),
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
				const background = context.getImageData(3, 3, 1, 1).data;
				const differsFromBackground = (x: number, y: number) => {
					const pixel = context.getImageData(x, y, 1, 1).data;
					return [0, 1, 2].some((index) => pixel[index] !== background[index]);
				};
				return {
					backgroundOpaque: background[3] === 255,
					topLeftRectVisible: differsFromBackground(1, 1),
					nextColumnRectVisible: differsFromBackground(6, 1),
					nextRowRectVisible: differsFromBackground(1, 6),
					nestedRectVisible: differsFromBackground(6, 6),
					horizontalGapClear: !differsFromBackground(3, 1),
					verticalGapClear: !differsFromBackground(1, 3),
					bottomRightRectVisible: differsFromBackground(95, 95),
				};
			}),
		)
		.toEqual({
			backgroundOpaque: true,
			topLeftRectVisible: true,
			nextColumnRectVisible: true,
			nextRowRectVisible: true,
			nestedRectVisible: true,
			horizontalGapClear: true,
			verticalGapClear: true,
			bottomRightRectVisible: true,
		});
});
