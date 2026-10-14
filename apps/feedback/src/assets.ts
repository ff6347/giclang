// ABOUTME: Serves an explicit set of local feedback assets and package-owned style files.
// ABOUTME: Keeps filesystem paths and private data outside the public asset namespace.

import { readFileSync, readdirSync } from "node:fs";
import type { Hono } from "hono";

export function serveAssets(app: Hono) {
	const tokens = new URL(import.meta.resolve("@giclang/styles/tokens.css"));
	const files: [string, URL, string][] = [
		["tokens.css", tokens, "text/css; charset=utf-8"],
		[
			"feedback.css",
			new URL("../public/feedback.css", import.meta.url),
			"text/css; charset=utf-8",
		],
		[
			"form.js",
			new URL("../public/form.js", import.meta.url),
			"text/javascript; charset=utf-8",
		],
	];
	for (const name of readdirSync(new URL("./fonts/", tokens))) {
		if (name.endsWith(".ttf"))
			files.push([
				`fonts/${name}`,
				new URL(`./fonts/${name}`, tokens),
				"font/ttf",
			]);
	}
	for (const [name, file, contentType] of files) {
		const bytes = new Uint8Array(readFileSync(file));
		app.get(`/assets/${name}`, (c) => {
			c.header("Content-Type", contentType);
			return c.body(bytes);
		});
	}
}
