// ABOUTME: Verifies the source-to-visible-Canvas flow in Firefox.
// ABOUTME: Exercises static and computed drawing updates through the browser shell.

import { expect, test, type Page } from "@playwright/test";

async function sampleCanvas(page: Page) {
	return page.locator("#canvas").evaluate((element) => {
		if (!(element instanceof HTMLCanvasElement)) {
			throw new Error("Expected #canvas to be a canvas element.");
		}
		const context = element.getContext("2d");
		if (context === null) {
			throw new Error("Expected a 2D canvas context.");
		}
		const corner = context.getImageData(0, 0, 1, 1).data;
		const center = context.getImageData(50, 50, 1, 1).data;
		return {
			cornerOpaque: corner[3] === 255,
			centerOpaque: center[3] === 255,
			centerDiffersFromCorner: [0, 1, 2].some(
				(index) => center[index] !== corner[index],
			),
		};
	});
}

test("renders background and circle commands on Canvas", async ({ page }) => {
	const source = `background(20, 0, 0);
circle(50, 50, 30);`;
	await page.goto("/");
	await page.getByLabel("GiC").fill(source);

	await expect
		.poll(() => sampleCanvas(page))
		.toEqual({
			cornerOpaque: true,
			centerOpaque: true,
			centerDiffersFromCorner: true,
		});
});

test("applies fill commands to subsequent circles", async ({ page }) => {
	const source = `background(100, 0, 0);
fill(0, 0, 0);
circle(50, 50, 30);`;
	await page.goto("/");
	await page.getByLabel("GiC").fill(source);

	await expect
		.poll(() => sampleCanvas(page))
		.toEqual({
			cornerOpaque: true,
			centerOpaque: true,
			centerDiffersFromCorner: true,
		});
});

test("renders background alpha", async ({ page }) => {
	const source = "background(0, 0, 0, 50);";
	await page.goto("/");
	await page.getByLabel("GiC").fill(source);

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
				return context.getImageData(0, 0, 1, 1).data[3];
			}),
		)
		.toBe(128);
});

test("renders fill alpha on subsequent circles", async ({ page }) => {
	const source = `fill(0, 0, 0, 50);
noStroke();
circle(50, 50, 30);`;
	await page.goto("/");
	await page.getByLabel("GiC").fill(source);

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
					cornerAlpha: context.getImageData(0, 0, 1, 1).data[3],
					circleCenterAlpha: context.getImageData(50, 50, 1, 1).data[3],
				};
			}),
		)
		.toEqual({
			cornerAlpha: 0,
			circleCenterAlpha: 128,
		});
});

test("does not stroke circles after noStroke", async ({ page }) => {
	const source = `background(100, 0, 0);
fill(0, 0, 0, 0);
noStroke();
circle(50, 50, 30.5);`;
	await page.goto("/");
	await page.getByLabel("GiC").fill(source);

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
				const corner = context.getImageData(0, 0, 1, 1).data;
				const circleEdge = context.getImageData(80, 50, 1, 1).data;
				return {
					cornerOpaque: corner[3] === 255,
					edgeDiffersFromCorner: [0, 1, 2].some(
						(index) => circleEdge[index] !== corner[index],
					),
				};
			}),
		)
		.toEqual({
			cornerOpaque: true,
			edgeDiffersFromCorner: false,
		});
});

test("renders only the latest of rapid source edits", async ({ page }) => {
	const initialSource = `background(20, 0, 0);
circle(50, 50, 30);`;
	const latestSource = "background(20, 0, 0);";
	await page.goto("/");
	const editor = page.getByLabel("GiC");

	await editor.fill(initialSource);
	await editor.fill(latestSource);

	await expect
		.poll(() => sampleCanvas(page))
		.toEqual({
			cornerOpaque: true,
			centerOpaque: true,
			centerDiffersFromCorner: false,
		});
});

test("clears the preview and shows a source-located diagnostic", async ({
	page,
}) => {
	const validSource = `background(20, 0, 0);
circle(50, 50, 30);`;
	const invalidSource = "circle(50, 50);";
	await page.goto("/");
	const editor = page.getByLabel("GiC");

	await editor.fill(validSource);
	await expect
		.poll(() => sampleCanvas(page))
		.toEqual({
			cornerOpaque: true,
			centerOpaque: true,
			centerDiffersFromCorner: true,
		});

	await editor.fill(invalidSource);
	await expect
		.poll(() => sampleCanvas(page))
		.toEqual({
			cornerOpaque: false,
			centerOpaque: false,
			centerDiffersFromCorner: false,
		});
	await expect(page.locator("#diagnostics")).toHaveText(
		"Line 1: Function 'circle' expects 3 arguments, but got 2.",
	);
});

test("updates visible geometry after editing a computed value", async ({
	page,
}) => {
	const initialSource = `background(20, 0, 0);
let size = 10;
size = size * 3;
if (size > 20) {
	circle(50, 50, size);
}`;
	const updatedSource = `background(20, 0, 0);
let size = 5;
size = size * 3;
if (size > 20) {
	circle(50, 50, size);
}`;
	await page.goto("/");
	const editor = page.getByLabel("GiC");

	await editor.fill(initialSource);
	await expect
		.poll(() => sampleCanvas(page))
		.toEqual({
			cornerOpaque: true,
			centerOpaque: true,
			centerDiffersFromCorner: true,
		});

	await editor.fill(updatedSource);
	await expect
		.poll(() => sampleCanvas(page))
		.toEqual({
			cornerOpaque: true,
			centerOpaque: true,
			centerDiffersFromCorner: false,
		});
});

test("clears computed output after a dynamic operand error", async ({
	page,
}) => {
	const validSource = `background(20, 0, 0);
let size = 10;
size = size * 3;
if (size > 20) {
	circle(50, 50, size);
}`;
	const invalidSource = `background(20, 0, 0);
let size = "large";
if (size > 20) {
	circle(50, 50, size);
}`;
	await page.goto("/");
	const editor = page.getByLabel("GiC");

	await editor.fill(validSource);
	await expect
		.poll(() => sampleCanvas(page))
		.toEqual({
			cornerOpaque: true,
			centerOpaque: true,
			centerDiffersFromCorner: true,
		});

	await editor.fill(invalidSource);
	await expect
		.poll(() => sampleCanvas(page))
		.toEqual({
			cornerOpaque: false,
			centerOpaque: false,
			centerDiffersFromCorner: false,
		});
	await expect(page.locator("#diagnostics")).toHaveText(
		"Line 3: Cannot compare non-number values.",
	);
});
