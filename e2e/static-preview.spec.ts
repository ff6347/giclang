// ABOUTME: Verifies the source-to-visible-Canvas flow in Firefox.
// ABOUTME: Exercises the real browser shell using the Slice 1 acceptance program.

import { expect, test, type Page } from "@playwright/test";

const acceptanceSource = `background(20, 0, 0);
circle(50, 50, 30);`;
const backgroundOnlySource = "background(20, 0, 0);";

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
	await page.goto("/");
	await page.getByLabel("GiC").fill(acceptanceSource);

	await expect
		.poll(() => sampleCanvas(page))
		.toEqual({
			cornerOpaque: true,
			centerOpaque: true,
			centerDiffersFromCorner: true,
		});
});

test("renders only the latest of rapid source edits", async ({ page }) => {
	await page.goto("/");
	const editor = page.getByLabel("GiC");

	await editor.fill(acceptanceSource);
	await editor.fill(backgroundOnlySource);

	await expect
		.poll(() => sampleCanvas(page))
		.toEqual({
			cornerOpaque: true,
			centerOpaque: true,
			centerDiffersFromCorner: false,
		});
});
