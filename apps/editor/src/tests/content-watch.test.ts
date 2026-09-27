// ABOUTME: Verifies Vite refreshes bundled content when an authored file appears or disappears.
// ABOUTME: Exercises the real workspace content directory and Vite module graph.

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

test("content discovery refreshes after creating and deleting documents and examples", async () => {
	const id = `content-watch-${randomUUID()}`;
	const document = new URL(
		`../../../../packages/content/content/docs/${id}.md`,
		import.meta.url,
	);
	const example = new URL(
		`../../../../packages/content/content/examples/${id}/`,
		import.meta.url,
	);
	const server = await createServer({
		configFile: fileURLToPath(new URL("../../vite.config.ts", import.meta.url)),
		logLevel: "error",
		root: fileURLToPath(new URL("../../", import.meta.url)),
		server: { middlewareMode: true, preTransformRequests: false },
	});
	const hasContent = async (name: string) => {
		const result = await server.transformRequest("/src/lib/content.ts");
		assert.ok(result);
		return result.code.includes(name);
	};
	const waitForContent = async (name: string, expected: boolean) => {
		for (let attempt = 0; attempt < 50; attempt++) {
			if ((await hasContent(name)) === expected) return;
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		assert.strictEqual(await hasContent(name), expected);
	};

	try {
		assert.strictEqual(await hasContent(`${id}.md`), false);
		await writeFile(
			document,
			"---\ntitle: Content watcher\norder: 999\n---\nA watched page.\n",
		);
		await waitForContent(`${id}.md`, true);
		await rm(document);
		await waitForContent(`${id}.md`, false);

		await mkdir(example);
		await Promise.all([
			writeFile(
				new URL("description.md", example),
				"---\ntitle: Content watcher\norder: 999\nenabled: true\ncategories: [Test]\ntags: [test]\n---\nA watched example.\n",
			),
			writeFile(new URL(`${id}.gic`, example), "circle(10, 10, 10);\n"),
			copyFile(
				new URL(
					"../../../../packages/content/content/examples/repeat/thumbnail.png",
					import.meta.url,
				),
				new URL("thumbnail.png", example),
			),
		]);
		await waitForContent(`/${id}/description.md`, true);
		await rm(example, { recursive: true });
		await waitForContent(`/${id}/description.md`, false);
	} finally {
		await rm(document, { force: true });
		await rm(example, { force: true, recursive: true });
		await server.close();
	}
});
