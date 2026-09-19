// ABOUTME: Verifies the generated standalone artifact with the real GIC runtime.
// ABOUTME: Opens one exported file directly in Chromium, Firefox, and WebKit.

import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { chromium, firefox, webkit } from "@playwright/test";
import { standaloneHtml } from "../browser/src/standalone-export.ts";

const outputDirectory = resolve("test-results/standalone-html-export");
const artifactPath = resolve(outputDirectory, "sketch.html");
const source =
	'background(20, 0, 0);\nfill(0, 0, 0);\ncircle(50, 50, 30);\nprint("hello");';

async function artifact() {
	const [runtime, worker] = await Promise.all([
		readFile("browser/public/standalone/runtime.js", "utf8"),
		readFile("browser/public/standalone/worker.js", "utf8"),
	]);
	return standaloneHtml(source, runtime, worker);
}

test(
	"runs generated GIC export from file://",
	{ timeout: 45_000 },
	async (t) => {
		for (const [name, engine] of Object.entries({
			chromium,
			firefox,
			webkit,
		})) {
			await t.test(`${name}`, { timeout: 15_000 }, async () => {
				await mkdir(outputDirectory, { recursive: true });
				await writeFile(artifactPath, await artifact());
				const browser = await engine.launch();
				const page = await browser.newPage();
				const requests = [];
				page.on("request", (request) => requests.push(request.url()));
				try {
					await page.goto(pathToFileURL(artifactPath).href);
					await page.waitForFunction(() =>
						document
							.querySelector("#output")
							?.textContent?.includes("Line 4: hello"),
					);
					const pixel = await page.locator("canvas").evaluate((element) => {
						const context = element.getContext("2d");
						return context?.getImageData(0, 0, 1, 1).data[3];
					});
					assert.equal(pixel, 255);
					assert.deepEqual(
						requests.filter(
							(url) => !url.startsWith("file:") && !url.startsWith("blob:"),
						),
						[],
					);
					await page.getByLabel("Source").fill("circle(50, 50);");
					await page.waitForFunction(
						() =>
							document.querySelector("#diagnostics")?.textContent?.length > 0,
					);
					assert.equal(
						await page.locator("canvas").evaluate((element) => {
							const context = element.getContext("2d");
							return context?.getImageData(0, 0, 1, 1).data[3];
						}),
						0,
					);
				} finally {
					await browser.close();
					await rm(outputDirectory, { force: true, recursive: true });
				}
			});
		}
	},
);
