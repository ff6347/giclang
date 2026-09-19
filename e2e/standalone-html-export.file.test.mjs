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
	'background(20, 0, 0);\nfill(0, 0, 0);\ncircle(50, 50, 30);\nprint("first");\nprint("second");';
const validSource = 'background(20, 0, 0);\nprint("recovered");';
const runawaySource = `func forever() {
	repeat(i, 0, 100000) {}
	return forever();
}
forever();`;

async function artifact() {
	const [runtime, worker] = await Promise.all([
		readFile("browser/public/standalone/runtime.js", "utf8"),
		readFile("browser/public/standalone/worker.js", "utf8"),
	]);
	return standaloneHtml(source, runtime, worker);
}

async function canvasAlpha(page, x = 0, y = 0) {
	return page.locator("canvas").evaluate(
		(element, point) => {
			const context = element.getContext("2d");
			return context?.getImageData(point.x, point.y, 1, 1).data[3];
		},
		{ x, y },
	);
}

async function replaceSource(page, nextSource) {
	await page.getByLabel("Source").fill(nextSource);
}

async function expectFailure(page, nextSource, message) {
	await replaceSource(page, nextSource);
	await page.waitForFunction(
		(expected) =>
			document.querySelector("#diagnostics")?.textContent === expected,
		message,
	);
	assert.equal(await canvasAlpha(page), 0);
	assert.doesNotMatch(
		(await page.locator("#diagnostics").textContent()) ?? "",
		/\n\s*at\s|Error:/,
	);
}

test(
	"runs generated GIC export from file://",
	{ timeout: 60_000 },
	async (t) => {
		const html = await artifact();
		assert.doesNotMatch(html, /\bmonaco\b/i);
		assert.doesNotMatch(html, /\b(?:localStorage|sessionStorage|indexedDB)\b/);
		assert.doesNotMatch(html, />\s*Reset\s*</i);
		assert.doesNotMatch(html, /https?:\/\//i);

		for (const [name, engine] of Object.entries({
			chromium,
			firefox,
			webkit,
		})) {
			await t.test(`${name}`, { timeout: 20_000 }, async () => {
				await mkdir(outputDirectory, { recursive: true });
				await writeFile(artifactPath, html);
				const browser = await engine.launch();
				const page = await browser.newPage();
				const requests = [];
				page.on("request", (request) => requests.push(request.url()));
				try {
					await page.goto(pathToFileURL(artifactPath).href);
					await page.waitForFunction(() =>
						document
							.querySelector("#output")
							?.textContent?.includes("Line 5: second"),
					);
					assert.equal(await canvasAlpha(page), 255);
					assert.equal(
						await page.locator("#output").textContent(),
						"Line 4: first\nLine 5: second",
					);

					await expectFailure(
						page,
						"let size = 10",
						"Line 1: Expected semicolon after variable declaration.",
					);
					await expectFailure(
						page,
						"circle(50, 50);",
						"Line 1: Function 'circle' expects 3 arguments, but got 2.",
					);
					await expectFailure(
						page,
						'background(20, 0, 0);\nprint("before failure");\nlet size = "large";\nif (size > 20) {}',
						"Line 4: Cannot compare non-number values.",
					);
					assert.equal(
						await page.locator("#output").textContent(),
						"Line 2: before failure",
					);

					await replaceSource(page, runawaySource);
					assert.equal(await page.locator("#output").textContent(), "");
					assert.equal(await page.locator("#diagnostics").textContent(), "");
					await page.waitForTimeout(150);
					await replaceSource(page, validSource);
					await page.waitForFunction(
						() =>
							document.querySelector("#output")?.textContent ===
							"Line 2: recovered",
					);
					await page.waitForTimeout(500);
					assert.equal(await canvasAlpha(page), 255);
					assert.equal(await page.locator("#diagnostics").textContent(), "");

					await replaceSource(page, runawaySource);
					await page.waitForFunction(
						() =>
							document.querySelector("#diagnostics")?.textContent ===
							"The preview took too long and was terminated.",
					);
					assert.equal(await canvasAlpha(page), 0);
					assert.equal(await page.locator("#output").textContent(), "");

					await replaceSource(page, validSource);
					await page.waitForFunction(
						() =>
							document.querySelector("#output")?.textContent ===
							"Line 2: recovered",
					);
					assert.equal(await canvasAlpha(page), 255);
					assert.equal(await page.locator("#diagnostics").textContent(), "");
					assert.deepEqual(
						requests.filter(
							(url) => !url.startsWith("file:") && !url.startsWith("blob:"),
						),
						[],
					);
				} finally {
					await browser.close();
					await rm(outputDirectory, { force: true, recursive: true });
				}
			});
		}
	},
);
