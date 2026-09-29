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
	assert.match(html, /Gestalten in Code is a small C-style language/);
});
