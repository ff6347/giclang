// ABOUTME: Verifies the site can prerender package-owned content.
// ABOUTME: Exercises the production bundle where module-relative paths change.

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
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

	const skillPage = await readFile(
		new URL("../../dist/docs/skill/index.html", import.meta.url),
		"utf8",
	);
	assert.match(skillPage, /<h1>Skill<\/h1>/);
	assert.match(skillPage, /aria-label="Documentation"[\s\S]*?>[\s\S]*?Skill/);
	assert.match(skillPage, /<h2>GIC agent skill<\/h2>/);
	assert.match(skillPage, /<h2>Language reference<\/h2>/);
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
