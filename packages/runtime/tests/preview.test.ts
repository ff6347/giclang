// ABOUTME: Exercises the published browser runtime with real workers and Canvas.
// ABOUTME: Verifies instance isolation, diagnostics, cancellation, and disposal.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { firefox, type Page } from "@playwright/test";
import { runSource } from "@giclang/core";

const runaway = "repeat(i, 0, 1000000000) {}";

async function pixel(page: Page, index: number) {
	return page
		.locator("canvas")
		.nth(index)
		.evaluate((canvas) =>
			Array.from(canvas.getContext("2d")!.getImageData(50, 50, 1, 1).data),
		);
}

async function waitForOutput(page: Page, index: number, text: string) {
	await page.waitForFunction(
		({ index, text }) =>
			document.querySelectorAll(".result")[index]?.textContent === text,
		{ index, text },
	);
}

async function waitForDiagnostic(page: Page, text: string) {
	await page.waitForFunction(
		(text) => document.querySelector(".problem")?.textContent === text,
		text,
	);
}

test(
	"browser runtime isolates sketches and recovers from failures",
	{ timeout: 30_000 },
	async () => {
		const runtime = await readFile(
			new URL("../dist/runtime.iife.js", import.meta.url),
			"utf8",
		);
		const browser = await firefox.launch();
		try {
			const page = await browser.newPage();
			const errors: string[] = [];
			page.on("pageerror", (error) => errors.push(error.message));
			await page.setContent(`<!doctype html><html lang="en"><title>Sketches</title><body>
			<div><canvas id="first-canvas" width="100" height="100"></canvas><canvas id="second-canvas" width="100" height="100"></canvas></div>
			<div><textarea id="first-input" aria-label="First source">ignored textarea value</textarea><input id="second-input" aria-label="Second source" value="ignored input value"></div>
			<div><pre id="first-diagnostics" class="problem"></pre><pre id="first-output" class="result"></pre><pre id="second-diagnostics" class="problem"></pre><pre id="second-output" class="result"></pre></div>
			<button id="dispose">Dispose first preview</button><button id="mount">Mount first preview</button>
			<script>${runtime}
			const firstOptions = {
				canvas: document.getElementById("first-canvas"),
				input: document.getElementById("first-input"),
				diagnostics: document.getElementById("first-diagnostics"),
				output: document.getElementById("first-output"),
				initialCode: 'background("#ff0000"); print("first");',
			};
			let dispose = GicRuntime.mountPreview(firstOptions);
			GicRuntime.mountPreview({
				canvas: document.getElementById("second-canvas"),
				input: document.getElementById("second-input"),
				diagnostics: document.getElementById("second-diagnostics"),
				output: document.getElementById("second-output"),
				initialCode: 'background("#0000ff"); print("second");',
			});
			document.getElementById("dispose").addEventListener("click", () => dispose());
			document.getElementById("mount").addEventListener("click", () => {
				dispose = GicRuntime.mountPreview({ ...firstOptions, initialCode: firstOptions.input.value });
			});
			</script></body></html>`);
			assert.deepEqual(errors, []);
			await waitForOutput(page, 0, "Line 1: first");
			await waitForOutput(page, 1, "Line 1: second");
			assert.deepEqual(await pixel(page, 0), [255, 0, 0, 255]);
			assert.deepEqual(await pixel(page, 1), [0, 0, 255, 255]);

			const source = 'background("#00ff00");\nprint("edited");';
			await page.getByLabel("First source").fill(source);
			const expected = runSource(source);
			assert.ok(expected.ok);
			await waitForOutput(
				page,
				0,
				expected.output
					.map((entry) => `Line ${entry.line + 1}: ${entry.text}`)
					.join("\n"),
			);
			assert.deepEqual(await pixel(page, 0), [0, 255, 0, 255]);
			assert.deepEqual(await pixel(page, 1), [0, 0, 255, 255]);

			for (const invalid of [
				"let size = 10",
				"circle(50, 50);",
				'print("before failure"); let size = "large"; if (size > 20) {}',
			]) {
				const result = runSource(invalid);
				assert.equal(result.ok, false);
				await page.getByLabel("First source").fill(invalid);
				await waitForDiagnostic(
					page,
					result.diagnostics
						.map((entry) => `Line ${entry.line + 1}: ${entry.message}`)
						.join("\n"),
				);
				assert.deepEqual(await pixel(page, 0), [0, 0, 0, 0]);
				assert.equal(
					await page.locator(".result").first().textContent(),
					result.output
						.map((entry) => `Line ${entry.line + 1}: ${entry.text}`)
						.join("\n"),
				);
			}

			await page.getByLabel("First source").fill(runaway);
			await page.waitForTimeout(150);
			await page.getByLabel("First source").fill(source);
			await waitForOutput(page, 0, "Line 2: edited");
			await page.waitForTimeout(600);
			assert.equal(await page.locator(".problem").first().textContent(), "");
			assert.deepEqual(await pixel(page, 0), [0, 255, 0, 255]);

			await page
				.getByLabel("First source")
				.fill("func recurse() { return recurse(); } print(recurse());");
			await waitForDiagnostic(page, "The preview could not be generated.");
			assert.deepEqual(await pixel(page, 0), [0, 0, 0, 0]);

			await page.getByLabel("First source").fill(runaway);
			await waitForDiagnostic(
				page,
				"The preview took too long and was terminated.",
			);
			assert.deepEqual(await pixel(page, 0), [0, 0, 0, 0]);
			await page.getByLabel("First source").fill(source);
			await waitForOutput(page, 0, "Line 2: edited");

			await page.getByLabel("First source").fill(runaway);
			await page.waitForTimeout(150);
			await page.getByRole("button", { name: "Dispose first preview" }).click();
			await page.waitForTimeout(600);
			assert.equal(await page.locator(".problem").first().textContent(), "");
			await page.getByLabel("First source").fill(source);
			await page.waitForTimeout(200);
			assert.equal(await page.locator(".result").first().textContent(), "");
			assert.deepEqual(await pixel(page, 0), [0, 0, 0, 0]);
			await page.getByRole("button", { name: "Mount first preview" }).click();
			await waitForOutput(page, 0, "Line 2: edited");

			await page.getByLabel("First source").fill('print("pending");');
			await page.getByRole("button", { name: "Dispose first preview" }).click();
			await page.waitForTimeout(250);
			assert.equal(await page.locator(".result").first().textContent(), "");
			assert.equal(await page.locator(".problem").first().textContent(), "");
			await page
				.getByLabel("Second source")
				.fill('background("#00ff00"); print("input edited");');
			await waitForOutput(page, 1, "Line 1: input edited");
			assert.deepEqual(await pixel(page, 1), [0, 255, 0, 255]);
			assert.deepEqual(errors, []);
		} finally {
			await browser.close();
		}
	},
);
