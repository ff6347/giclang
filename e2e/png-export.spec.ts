// ABOUTME: Verifies PNG export from the current successful Canvas preview.
// ABOUTME: Covers preview freshness, download dimensions, pixel data, and control placement.

import { expect, test, type Page } from "@playwright/test";
import { setEditorSource } from "./editor.ts";
import { readPng } from "./png.ts";

async function canvasPixels(page: Page) {
	return page.locator("#canvas").evaluate((element) => {
		if (!(element instanceof HTMLCanvasElement)) {
			throw new Error("Expected #canvas to be a canvas element.");
		}
		const context = element.getContext("2d");
		if (context === null) throw new Error("Expected a 2D canvas context.");
		return {
			corner: [...context.getImageData(0, 0, 1, 1).data],
			center: [...context.getImageData(50, 50, 1, 1).data],
		};
	});
}

test("exports only the current successful preview as a native-size PNG", async ({
	page,
}) => {
	await page.goto("/");
	const downloadButton = page.getByRole("button", { name: "Download PNG" });
	await expect(downloadButton).toBeDisabled();

	await setEditorSource(
		page,
		"background(20, 0, 0);\nfill(0, 0, 0);\ncircle(50, 50, 30);",
	);
	await expect(downloadButton).toBeEnabled();
	const expectedPixels = await canvasPixels(page);

	const downloadPromise = page.waitForEvent("download");
	await downloadButton.click();
	const download = await downloadPromise;
	const stream = await download.createReadStream();
	if (stream === null) throw new Error("Expected a PNG download stream.");
	const chunks: Buffer[] = [];
	for await (const chunk of stream) chunks.push(chunk);
	const png = readPng(Buffer.concat(chunks));
	expect({ width: png.width, height: png.height }).toEqual({
		width: 100,
		height: 100,
	});
	expect([...png.pixels.subarray(0, 4)]).toEqual(expectedPixels.corner);
	expect([
		...png.pixels.subarray((50 * 100 + 50) * 4, (50 * 100 + 51) * 4),
	]).toEqual(expectedPixels.center);

	await setEditorSource(page, "circle(50, 50);");
	await expect(downloadButton).toBeDisabled();
});

test("refreshes capture ownership when opening a different document with identical source", async ({
	page,
}) => {
	await page.goto("/");
	const source = "background(50, 50, random(0, 360));";
	await setEditorSource(page, source);
	const downloadButton = page.getByRole("button", { name: "Download PNG" });
	await expect(downloadButton).toBeEnabled();
	const firstPixels = await canvasPixels(page);

	await page.getByRole("menuitem", { name: "File", exact: true }).click();
	await page
		.getByRole("menu", { name: "File" })
		.getByRole("menuitem", { name: "Open", exact: true })
		.click();
	await page.locator("#open-file").setInputFiles({
		name: "same-source.gic",
		mimeType: "text/plain",
		buffer: Buffer.from(source),
	});
	await page
		.getByRole("alertdialog", { name: "Discard changes?" })
		.getByRole("button", { name: "Discard changes" })
		.click();
	await expect(downloadButton).toBeDisabled();
	await expect(downloadButton).toBeEnabled();
	await expect.poll(() => canvasPixels(page)).not.toEqual(firstPixels);

	const downloadPromise = page.waitForEvent("download");
	await downloadButton.click();
	const download = await downloadPromise;
	const stream = await download.createReadStream();
	if (stream === null) throw new Error("Expected a PNG download stream.");
	const chunks: Buffer[] = [];
	for await (const chunk of stream) chunks.push(chunk);
	const png = readPng(Buffer.concat(chunks));
	const expectedPixels = await canvasPixels(page);
	expect([
		...png.pixels.subarray((50 * 100 + 50) * 4, (50 * 100 + 51) * 4),
	]).toEqual(expectedPixels.center);
});

test("places PNG export in the Preview panel's lower-right corner", async ({
	page,
}) => {
	await page.goto("/");
	const preview = page.getByRole("region", { name: "Preview" });
	const downloadButton = page.getByRole("button", { name: "Download PNG" });
	const previewBox = await preview.boundingBox();
	const downloadBox = await downloadButton.boundingBox();
	expect(previewBox).not.toBeNull();
	expect(downloadBox).not.toBeNull();
	expect(downloadBox!.x + downloadBox!.width).toBeLessThanOrEqual(
		previewBox!.x + previewBox!.width,
	);
	expect(downloadBox!.y + downloadBox!.height).toBeLessThanOrEqual(
		previewBox!.y + previewBox!.height,
	);
	expect(downloadBox!.x).toBeGreaterThan(previewBox!.x + previewBox!.width / 2);
	expect(downloadBox!.y).toBeGreaterThan(
		previewBox!.y + previewBox!.height / 2,
	);
});

test("shows disabled standalone HTML export beside PNG export", async ({
	page,
}) => {
	await page.goto("/");
	const htmlDownload = page.getByRole("button", {
		name: "Download standalone HTML",
	});
	const pngDownload = page.getByRole("button", { name: "Download PNG" });
	await expect(htmlDownload).toBeDisabled();

	const htmlBox = await htmlDownload.boundingBox();
	const pngBox = await pngDownload.boundingBox();
	expect(htmlBox).not.toBeNull();
	expect(pngBox).not.toBeNull();
	expect(htmlBox!.x + htmlBox!.width).toBeLessThanOrEqual(pngBox!.x);
	expect(htmlBox!.y).toBeCloseTo(pngBox!.y, 0);
});

test("distinguishes disabled exports and highlights enabled exports on hover", async ({
	page,
}) => {
	await page.goto("/");
	const buttons = [
		page.getByRole("button", { name: "Download PNG" }),
		page.getByRole("button", { name: "Download standalone HTML" }),
	];
	for (const button of buttons) {
		await expect(button).toBeDisabled();
		const opacity = await button.evaluate(
			(element) => getComputedStyle(element).opacity,
		);
		expect(Number(opacity)).toBeLessThan(1);
	}

	await setEditorSource(page, "circle(50, 50, 20);");
	for (const button of buttons) {
		await expect(button).toBeEnabled();
		const restingColor = await button.evaluate(
			(element) => getComputedStyle(element).backgroundColor,
		);
		await button.hover();
		await expect
			.poll(() =>
				button.evaluate((element) => getComputedStyle(element).backgroundColor),
			)
			.not.toBe(restingColor);
	}
});
