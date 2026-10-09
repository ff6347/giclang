// ABOUTME: Verifies static acceptance serving against real files and HTTP requests.
// ABOUTME: Covers UTF-8 Markdown, directory routes, asset MIME types, and path confinement.

import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createSiteServer } from "./serve-site-tests.mjs";

const markdown = "# Drawing\n\nÜber GiC — 終\n\n```gic\npoint(1, 2);\n```\n";
const assets = [
	[
		"style.css",
		"text/css; charset=utf-8",
		Buffer.from("body { margin: 0; }\n"),
	],
	[
		"copy.js",
		"text/javascript; charset=utf-8",
		Buffer.from("console.log('GiC');\n"),
	],
	[
		"icon.svg",
		"image/svg+xml; charset=utf-8",
		Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
	],
	["image.png", "image/png", Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])],
	["font.ttf", "font/ttf", Buffer.from([0, 1, 0, 0])],
	["font.woff2", "font/woff2", Buffer.from("wOF2")],
	["skill.zip", "application/zip", Buffer.from([80, 75, 3, 4])],
	["skill.txt", "text/plain; charset=utf-8", Buffer.from("Über GiC\n")],
	[
		"data.json",
		"application/json; charset=utf-8",
		Buffer.from('{"title":"GiC"}'),
	],
	["unknown.bin", "application/octet-stream", Buffer.from([0, 255, 10])],
] as const;

test("serves actual static files with production Markdown semantics and confined paths", async (t) => {
	const directory = await mkdtemp(join(tmpdir(), "gic-site-server-"));
	t.after(() => rm(directory, { recursive: true, force: true }));
	const root = join(directory, "dist");
	await mkdir(join(root, "docs/drawing"), { recursive: true });
	await mkdir(join(root, "assets"));
	await writeFile(join(root, "index.html"), "<!doctype html><h1>GiC</h1>");
	await writeFile(
		join(root, "docs/drawing/index.html"),
		"<!doctype html><h1>Drawing</h1>",
	);
	await writeFile(join(root, "docs/drawing.md"), markdown);
	await writeFile(join(root, "docs/a b.md"), markdown);
	await writeFile(join(directory, "secret.md"), "Outside the served root");
	await symlink(join(directory, "secret.md"), join(root, "escape.md"));
	await symlink(directory, join(root, "escape-directory"));
	await mkdir(join(root, "escaped-index"));
	await symlink(
		join(directory, "secret.md"),
		join(root, "escaped-index/index.html"),
	);
	await writeFile(join(root, "markdown.txt"), markdown);
	await symlink(join(root, "markdown.txt"), join(root, "alias.md"));
	for (const [name, , bytes] of assets)
		await writeFile(join(root, "assets", name), bytes);

	const server = await createSiteServer(root);
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	t.after(
		() =>
			new Promise<void>((resolve, reject) =>
				server.close((error) => (error ? reject(error) : resolve())),
			),
	);
	const address = server.address();
	assert.ok(address !== null && typeof address !== "string");
	const port = address.port;

	async function get(path: string, method = "GET") {
		return new Promise<{
			status: number | undefined;
			headers: Record<string, string | string[] | undefined>;
			body: Buffer;
		}>((resolve, reject) => {
			const req = request(
				{ hostname: "127.0.0.1", port, path, method },
				(response) => {
					const chunks: Buffer[] = [];
					response.on("data", (chunk: Buffer) => chunks.push(chunk));
					response.on("end", () =>
						resolve({
							status: response.statusCode,
							headers: response.headers,
							body: Buffer.concat(chunks),
						}),
					);
					response.on("error", reject);
				},
			);
			req.on("error", reject);
			req.end();
		});
	}

	await t.test(
		"declares UTF-8 Markdown and preserves complete Unicode bytes",
		async () => {
			for (const path of [
				"/docs/drawing.md",
				"/docs/drawing.md?download=1",
				"/docs/a%20b.md",
				"/alias.md",
			]) {
				const response = await get(path);
				assert.equal(response.status, 200);
				assert.equal(
					response.headers["content-type"],
					"text/markdown; charset=utf-8",
				);
				assert.deepEqual(response.body, Buffer.from(markdown, "utf8"));
			}
		},
	);
	await t.test(
		"serves directory index pages and redirects their slashless routes",
		async () => {
			for (const [path, body] of [
				["/", "<!doctype html><h1>GiC</h1>"],
				["/docs/drawing/", "<!doctype html><h1>Drawing</h1>"],
			]) {
				const response = await get(path);
				assert.equal(response.status, 200);
				assert.equal(
					response.headers["content-type"],
					"text/html; charset=utf-8",
				);
				assert.equal(response.body.toString("utf8"), body);
			}
			const redirect = await get("/docs/drawing?mode=read");
			assert.equal(redirect.status, 301);
			assert.equal(redirect.headers.location, "/docs/drawing/?mode=read");
		},
	);
	await t.test(
		"serves assets with their MIME types and exact binary bytes",
		async () => {
			for (const [name, type, bytes] of assets) {
				const response = await get(`/assets/${name}`);
				assert.equal(response.status, 200, name);
				assert.equal(response.headers["content-type"], type, name);
				assert.deepEqual(response.body, bytes, name);
			}
		},
	);
	await t.test(
		"returns ordinary 404 responses without an HTML fallback",
		async () => {
			for (const path of [
				"/missing.md",
				"/docs/missing.md",
				"/missing/",
				"/docs/drawing.md/",
			]) {
				const response = await get(path);
				assert.equal(response.status, 404, path);
				assert.equal(response.body.toString(), "Not found");
			}
		},
	);
	await t.test(
		"rejects traversal, malformed paths, and symlinks outside the root",
		async () => {
			for (const path of [
				"/../secret.md",
				"/%2e%2e/secret.md",
				"/docs/%2e%2e/%2e%2e/secret.md",
				"/%2e%2e%2fsecret.md",
				"/escape.md",
				"/escape-directory/secret.md",
				"/escaped-index/",
			]) {
				const response = await get(path);
				assert.equal(response.status, 403, path);
				assert.equal(response.body.toString(), "Forbidden");
			}
			for (const path of [
				"/bad%ZZ.md",
				"/docs/%00.md",
				"/docs/%5csecret.md",
				"//docs/drawing",
				"/%2fdocs/drawing",
			]) {
				assert.equal((await get(path)).status, 400, path);
			}
		},
	);
	await t.test("handles HEAD and rejects unsupported methods", async () => {
		const head = await get("/docs/drawing.md", "HEAD");
		assert.equal(head.status, 200);
		assert.equal(head.headers["content-type"], "text/markdown; charset=utf-8");
		assert.equal(
			head.headers["content-length"],
			String(Buffer.byteLength(markdown)),
		);
		assert.equal(head.body.length, 0);
		const post = await get("/docs/drawing.md", "POST");
		assert.equal(post.status, 405);
		assert.equal(post.headers.allow, "GET, HEAD");
	});
});
