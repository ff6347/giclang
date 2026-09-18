// ABOUTME: Verifies PNG export from the current successful Canvas preview.
// ABOUTME: Covers preview freshness, download dimensions, pixel data, and control placement.

import { expect, test, type Page } from "@playwright/test";
import { inflateSync } from "node:zlib";
import { setEditorSource } from "./editor.ts";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function readPng(bytes: Buffer): {
	height: number;
	pixels: Uint8Array;
	width: number;
} {
	expect(bytes.subarray(0, PNG_SIGNATURE.length)).toEqual(PNG_SIGNATURE);

	let offset = PNG_SIGNATURE.length;
	let height = 0;
	const imageData: Buffer[] = [];
	let width = 0;

	while (offset < bytes.length) {
		const length = bytes.readUInt32BE(offset);
		const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
		const data = bytes.subarray(offset + 8, offset + 8 + length);
		offset += length + 12;

		if (type === "IHDR") {
			width = data.readUInt32BE(0);
			height = data.readUInt32BE(4);
			expect(data[8]).toBe(8);
			expect(data[9]).toBe(6);
		}
		if (type === "IDAT") imageData.push(data);
	}

	const scanlines = inflateSync(Buffer.concat(imageData));
	const pixels = new Uint8Array(width * height * 4);
	const rowLength = width * 4;
	let scanlineOffset = 0;

	for (let y = 0; y < height; y += 1) {
		const filter = scanlines[scanlineOffset];
		scanlineOffset += 1;
		for (let x = 0; x < rowLength; x += 1) {
			const current = scanlines[scanlineOffset + x];
			const left = x >= 4 ? pixels[y * rowLength + x - 4] : 0;
			const above = y > 0 ? pixels[(y - 1) * rowLength + x] : 0;
			const upperLeft =
				y > 0 && x >= 4 ? pixels[(y - 1) * rowLength + x - 4] : 0;
			const index = y * rowLength + x;
			pixels[index] =
				filter === 0
					? current
					: filter === 1
						? (current + left) & 255
						: filter === 2
							? (current + above) & 255
							: filter === 3
								? (current + Math.floor((left + above) / 2)) & 255
								: (current + paeth(left, above, upperLeft)) & 255;
		}
		scanlineOffset += rowLength;
	}

	return { height, pixels, width };
}

function paeth(left: number, above: number, upperLeft: number): number {
	const prediction = left + above - upperLeft;
	const leftDistance = Math.abs(prediction - left);
	const aboveDistance = Math.abs(prediction - above);
	const upperLeftDistance = Math.abs(prediction - upperLeft);
	if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) {
		return left;
	}
	return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

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
