// ABOUTME: Verifies MDX imports the shared runtime through the blog component.
// ABOUTME: Runs production-built sketches under a nested deployment base.

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { firefox } from "@playwright/test";

test(
	"MDX bundles independent editable sketches beneath a deployment base",
	{ timeout: 120_000 },
	async (t) => {
		const temporary = await mkdtemp(join(tmpdir(), "gic-blog-runtime-"));
		t.after(() => rm(temporary, { recursive: true, force: true }));
		const output = join(temporary, "dist");
		await promisify(execFile)(
			"pnpm",
			[
				"exec",
				"astro",
				"build",
				"--root",
				"tests/runtime",
				"--outDir",
				output,
				"--base",
				"/workshop/",
			],
			{
				cwd: fileURLToPath(new URL("../../", import.meta.url)),
				timeout: 60_000,
			},
		);
		const server = createServer(async (request, response) => {
			const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
			const path = pathname.slice("/workshop/".length) || "index.html";
			try {
				const body = await readFile(join(output, path));
				response.setHeader(
					"Content-Type",
					extname(path) === ".js" ? "text/javascript" : "text/html",
				);
				response.end(body);
			} catch {
				response.writeHead(404).end();
			}
		});
		await new Promise<void>((resolve) =>
			server.listen(0, "127.0.0.1", resolve),
		);
		t.after(
			() => new Promise<void>((resolve) => server.close(() => resolve())),
		);
		const address = server.address();
		assert.ok(address && typeof address !== "string");
		const browser = await firefox.launch();
		t.after(() => browser.close());
		const page = await browser.newPage();
		const errors: string[] = [];
		page.on("pageerror", (error) => errors.push(error.message));
		page.on("response", (response) => {
			if (response.status() >= 400)
				errors.push(`${response.status()} ${response.url()}`);
		});
		await page.goto(`http://127.0.0.1:${address.port}/workshop/`);
		assert.deepEqual(errors, []);
		await page.waitForFunction(
			() =>
				document.querySelectorAll(".output")[1]?.textContent ===
				"Line 1: <second>",
		);
		assert.equal(await page.getByLabel("GIC source").count(), 2);
		assert.equal(
			await page.locator(".output").first().textContent(),
			"Line 1: first",
		);
		assert.deepEqual(
			await page
				.locator("canvas")
				.evaluateAll((canvases) =>
					canvases.map((canvas) =>
						Array.from(
							canvas.getContext("2d")!.getImageData(50, 50, 1, 1).data,
						),
					),
				),
			[
				[255, 0, 0, 255],
				[0, 0, 255, 255],
			],
		);
		await page
			.getByLabel("GIC source")
			.first()
			.fill('background("#00ff00"); print("edited");');
		await page.waitForFunction(
			() => document.querySelector(".output")?.textContent === "Line 1: edited",
		);
		assert.equal(
			await page.locator(".output").nth(1).textContent(),
			"Line 1: <second>",
		);
		await page
			.getByLabel("GIC source")
			.first()
			.fill("repeat(i, 0, 1000000000) {}");
		await page.waitForTimeout(150);
		await page
			.locator("gic-sketch")
			.first()
			.evaluate((element) => {
				element.remove();
				document.body.append(element);
			});
		await page.getByLabel("GIC source").nth(1).fill('print("reconnected");');
		await page.waitForFunction(
			() =>
				document.querySelectorAll(".output")[1]?.textContent ===
				"Line 1: reconnected",
		);
		await page.waitForTimeout(600);
		assert.equal(
			await page.locator(".output").nth(1).textContent(),
			"Line 1: reconnected",
		);
		assert.equal(await page.locator(".diagnostics").nth(1).textContent(), "");
		assert.deepEqual(errors, []);
	},
);
