// ABOUTME: Verifies real editor builds and development servers publish complete documentation Markdown.
// ABOUTME: Checks root and nested routes, exact authored payloads, stable assets, and response types.

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build, createLogger, createServer, preview } from "vite";
import { listContentFiles } from "@giclang/content/node";
import { readBundledDocumentation } from "../../../e2e/documentation-copy.ts";
import { readBundledDocumentationExport } from "../../../e2e/documentation-export.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const configFile = join(root, "vite.config.ts");

function capturedLogger() {
	const warnings: string[] = [];
	const errors: string[] = [];
	const logger = createLogger("silent");
	logger.warn = (message) => {
		warnings.push(message);
	};
	logger.warnOnce = logger.warn;
	logger.error = (message) => {
		errors.push(message);
	};
	return { logger, warnings, errors };
}

async function assertPages(origin: string, base: string, output?: string) {
	const files = await listContentFiles("docs");
	const expectedExport = await readBundledDocumentationExport();
	for (const path of ["llms.txt", "llms-full.txt"]) {
		const response = await fetch(`${origin}${base}${path}`);
		assert.equal(response.status, 200);
		assert.equal(
			response.headers.get("content-type"),
			"text/plain; charset=utf-8",
		);
		const text = await response.text();
		if (output) assert.equal(await readFile(join(output, path), "utf8"), text);
		if (path === "llms-full.txt") assert.equal(text, expectedExport.fullText);
		else {
			const links = [...text.matchAll(/^- \[([^\]]+)\]\(([^)]+)\)/gm)];
			assert.deepEqual(
				links.map((link) => link[2]),
				[
					...expectedExport.docs.map((doc) => `docs/${doc.id}.md`),
					"llms-full.txt",
				],
			);
			for (const link of links) {
				const url = new URL(link[2]!, `${origin}${base}llms.txt`);
				assert.equal(url.origin, origin);
				assert.ok(url.pathname.startsWith(base));
				assert.equal((await fetch(url)).status, 200);
			}
		}
	}
	for (const path of ["docs/%FF.md", "docs/%E0%A4%A.md"]) {
		assert.equal((await fetch(`${origin}${base}${path}`)).status, 400);
	}
	for (const file of files) {
		if (file.kind === "markdown") {
			const expected = await readBundledDocumentation(file.path.slice(5, -3));
			const response = await fetch(`${origin}${base}${file.path}`);
			assert.equal(response.status, 200);
			assert.match(
				response.headers.get("content-type") ?? "",
				/text\/markdown.*charset=utf-8/i,
			);
			assert.equal(await response.text(), expected.copyText);
			if (output)
				assert.equal(
					await readFile(join(output, file.path), "utf8"),
					expected.copyText,
				);
		} else {
			const response = await fetch(`${origin}${base}docs-assets/${file.path}`);
			assert.equal(response.status, 200);
			assert.deepEqual(
				Buffer.from(await response.arrayBuffer()),
				await readFile(file.fileUrl),
			);
		}
	}
}

for (const base of ["/", "/workshop/"]) {
	test(
		`publishes exact editor Markdown and assets under ${base}`,
		{ timeout: 60_000 },
		async () => {
			const directory = await mkdtemp(join(tmpdir(), "gic-editor-docs-"));
			const outDir = join(directory, "dist");
			const { logger, warnings, errors } = capturedLogger();
			try {
				await build({
					root,
					configFile,
					base,
					customLogger: logger,
					build: { outDir, emptyOutDir: true },
				});
				assert.deepEqual(errors, []);
				assert.ok(
					warnings.every((warning) =>
						warning.includes("Some chunks are larger than 500 kB"),
					),
					warnings.join("\n"),
				);
				const emittedOnly =
					"# Exported fixture\n\nComplete Markdown — without authored source.\n";
				await writeFile(join(outDir, "docs/emitted-only.md"), emittedOnly);
				const server = await preview({
					root,
					configFile,
					base,
					customLogger: logger,
					build: { outDir },
					preview: { host: "127.0.0.1", port: 0 },
				});
				try {
					const address = server.httpServer.address();
					assert.ok(address && typeof address !== "string");
					const origin = `http://127.0.0.1:${address.port}`;
					await assertPages(origin, base, outDir);
					const emitted = await fetch(`${origin}${base}docs/emitted-only.md`);
					assert.equal(
						emitted.headers.get("content-type"),
						"text/markdown; charset=utf-8",
					);
					assert.equal(await emitted.text(), emittedOnly);
				} finally {
					server.httpServer.closeAllConnections();
					await new Promise<void>((resolve, reject) =>
						server.httpServer.close((error) =>
							error ? reject(error) : resolve(),
						),
					);
				}
			} finally {
				await rm(directory, { recursive: true, force: true });
			}
		},
	);

	test(
		`serves bundled Markdown rather than the editor shell under ${base}`,
		{ timeout: 30_000 },
		async () => {
			const server = await createServer({
				root,
				configFile,
				base,
				logLevel: "error",
				server: { host: "127.0.0.1", port: 0 },
			});
			try {
				await server.listen();
				const address = server.httpServer?.address();
				assert.ok(address && typeof address !== "string");
				const origin = `http://127.0.0.1:${address.port}`;
				await assertPages(origin, base);
				assert.equal(
					(await fetch(`${origin}${base}docs/not-a-page.md`)).status,
					404,
				);
			} finally {
				await server.close();
			}
		},
	);
}
