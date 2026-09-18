// ABOUTME: Exercises the standalone Blob-worker artifact directly through file URLs.
// ABOUTME: Verifies cancellation, timeout, plain result data, and network isolation.

import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { chromium, firefox, webkit } from "@playwright/test";

const artifactUrl = pathToFileURL(
	resolve("spikes/standalone-file-workers/index.html"),
).href;

const engines = { chromium, firefox, webkit };

async function waitForText(page, selector, text) {
	await page.waitForFunction(
		({ selector, text }) =>
			document.querySelector(selector)?.textContent?.includes(text) ?? false,
		{ selector, text },
	);
}

async function canvasPixel(page) {
	return page.locator("#canvas").evaluate((element) => {
		if (!(element instanceof HTMLCanvasElement)) {
			throw new Error("Expected a Canvas.");
		}
		const context = element.getContext("2d");
		if (context === null) throw new Error("Expected a Canvas context.");
		return [...context.getImageData(0, 0, 1, 1).data];
	});
}

for (const [name, engine] of Object.entries(engines)) {
	test(
		`${name} runs the artifact from file:// with Blob workers`,
		{
			timeout: 15_000,
		},
		async (t) => {
			const browser = await engine.launch();
			t.diagnostic(`Browser version: ${browser.version()}`);
			const page = await browser.newPage();
			const requests = [];
			page.on("request", (request) => requests.push(request.url()));

			try {
				await page.goto(artifactUrl);
				assert.match(page.url(), /^file:/);
				await waitForText(page, "#status", "Ready");

				const source = page.getByLabel("Source");
				await source.fill("draw #ff0000\nprint hello");
				await waitForText(page, "#output", "Line 2: hello");
				assert.deepEqual(await canvasPixel(page), [255, 0, 0, 255]);

				await source.fill("diagnostic");
				await waitForText(page, "#diagnostics", "Expected a drawing command.");
				assert.deepEqual(await canvasPixel(page), [0, 0, 0, 0]);

				await source.fill("runtime");
				await waitForText(page, "#runtime-error", "The sketch failed.");

				await source.fill("delay #ff0000");
				await page.waitForTimeout(150);
				await source.fill("draw #0000ff");
				await waitForText(page, "#status", "Rendered");
				await page.waitForTimeout(350);
				assert.deepEqual(await canvasPixel(page), [0, 0, 255, 255]);

				await source.fill("loop");
				await waitForText(page, "#status", "timed out");
				await source.fill("draw #00ff00");
				await waitForText(page, "#status", "Rendered");
				assert.deepEqual(await canvasPixel(page), [0, 255, 0, 255]);

				assert.deepEqual(
					requests.filter(
						(url) =>
							!url.startsWith("file:") &&
							!url.startsWith("blob:") &&
							!url.startsWith("data:"),
					),
					[],
				);
			} finally {
				await browser.close();
			}
		},
	);
}
