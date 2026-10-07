// ABOUTME: Verifies the site can prerender package-owned content.
// ABOUTME: Exercises the production bundle where module-relative paths change.

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname } from "node:path";
import { firefox } from "@playwright/test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const site = fileURLToPath(new URL("../../", import.meta.url));

test("build prerenders the About content", async () => {
	await promisify(execFile)("pnpm", ["build"], {
		cwd: site,
		timeout: 120_000,
	});
	const html = await readFile(
		new URL("../../dist/index.html", import.meta.url),
		"utf8",
	);
	assert.match(html, /<main>[\s\S]*<\/main>/);
});

test("documentation images resolve to emitted package assets", async () => {
	const page = new URL("../../dist/docs/drawing/index.html", import.meta.url);
	const html = await readFile(page, "utf8");
	const images = [...html.matchAll(/<img\b[^>]*src="([^"]+)"/g)];
	assert.equal(images.length, 9);
	for (const [, source] of images) {
		const url = new URL(source, "https://gic.example/docs/drawing/");
		const bytes = await readFile(
			new URL(`../../dist${url.pathname}`, import.meta.url),
		);
		assert.equal(bytes.subarray(1, 4).toString(), "PNG");
	}
});

test("documentation uses grey inline code and plain scrollable code blocks", async (t) => {
	const types: Record<string, string> = {
		".css": "text/css",
		".html": "text/html",
		".js": "text/javascript",
		".png": "image/png",
		".svg": "image/svg+xml",
		".ttf": "font/ttf",
	};
	const server = createServer(async (request, response) => {
		const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
		const file = new URL(
			`../../dist${path.endsWith("/") ? `${path}index.html` : path}`,
			import.meta.url,
		);
		try {
			const body = await readFile(file);
			response.writeHead(200, {
				"content-type":
					types[extname(file.pathname)] ?? "application/octet-stream",
			});
			response.end(body);
		} catch {
			response.writeHead(404).end();
		}
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
	const address = server.address();
	assert.ok(address !== null && typeof address !== "string");
	const browser = await firefox.launch();
	t.after(() => browser.close());
	const page = await browser.newPage();
	await page.goto(`http://127.0.0.1:${address.port}/docs/functions/`);
	const inline = page.locator("main p code").first();
	const block = page.locator("main pre").first();
	assert.equal(await inline.count(), 1);
	assert.equal(await block.count(), 1);
	const styles = await page.evaluate(() => {
		const inline = getComputedStyle(document.querySelector("main p code")!);
		const block = getComputedStyle(document.querySelector("main pre")!);
		const blockCode = getComputedStyle(
			document.querySelector("main pre code")!,
		);
		const body = getComputedStyle(document.body);
		return {
			inlineBackground: inline.backgroundColor,
			inlineStyle: inline.fontStyle,
			inlineFamily: inline.fontFamily,
			inlineSize: inline.fontSize,
			blockBackground: block.backgroundColor,
			blockCodeBackground: blockCode.backgroundColor,
			blockFamily: block.fontFamily,
			blockSize: block.fontSize,
			blockCodeFamily: blockCode.fontFamily,
			blockCodeSize: blockCode.fontSize,
			blockStyle: blockCode.fontStyle,
			blockWhitespace: blockCode.whiteSpace,
			borderLeft: block.borderLeftWidth,
			paddingLeft: block.paddingLeft,
			overflowX: block.overflowX,
			bodyFamily: body.fontFamily,
			bodySize: body.fontSize,
		};
	});
	assert.equal(styles.inlineBackground, "rgb(240, 240, 240)");
	assert.equal(styles.inlineStyle, "italic");
	assert.equal(styles.inlineFamily, styles.bodyFamily);
	assert.equal(styles.inlineSize, styles.bodySize);
	assert.equal(styles.blockBackground, "rgba(0, 0, 0, 0)");
	assert.equal(styles.blockCodeBackground, "rgba(0, 0, 0, 0)");
	assert.equal(styles.blockStyle, "normal");
	assert.equal(styles.blockFamily, styles.bodyFamily);
	assert.equal(styles.blockSize, styles.bodySize);
	assert.equal(styles.blockCodeFamily, styles.bodyFamily);
	assert.equal(styles.blockCodeSize, styles.bodySize);
	assert.equal(styles.blockWhitespace, "pre");
	assert.equal(styles.borderLeft, "0px");
	assert.equal(styles.paddingLeft, "0px");
	assert.equal(styles.overflowX, "auto");
});
