// ABOUTME: Serves the built website for production static browser acceptance.
// ABOUTME: Matches UTF-8 Markdown serving while confining requests to the static root.
// @ts-check

import { readFile, realpath, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {Record<string, string>} */
const contentTypes = {
	".html": "text/html; charset=utf-8",
	".md": "text/markdown; charset=utf-8",
	".txt": "text/plain; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".webmanifest": "application/manifest+json; charset=utf-8",
	".svg": "image/svg+xml; charset=utf-8",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".webp": "image/webp",
	".ico": "image/x-icon",
	".ttf": "font/ttf",
	".otf": "font/otf",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".zip": "application/zip",
};

/** @param {string} directory */
export async function createSiteServer(directory) {
	const root = await realpath(directory);
	/** @param {string} path */
	const confined = (path) => {
		const pathFromRoot = relative(root, path);
		return !isAbsolute(pathFromRoot) && pathFromRoot.split(sep)[0] !== "..";
	};

	return createServer(async (request, response) => {
		/** @param {number} status @param {string} message */
		const reply = (status, message) => {
			response.writeHead(status, {
				"Content-Type": "text/plain; charset=utf-8",
			});
			response.end(request.method === "HEAD" ? undefined : message);
		};
		if (request.method !== "GET" && request.method !== "HEAD") {
			response.setHeader("Allow", "GET, HEAD");
			reply(405, "Method not allowed");
			return;
		}
		const url = request.url ?? "/";
		const [rawPath = "/"] = url.split("?");
		let path;
		try {
			path = decodeURIComponent(rawPath);
		} catch {
			reply(400, "Bad request");
			return;
		}
		if (
			!path.startsWith("/") ||
			path.startsWith("//") ||
			path.includes("\0") ||
			path.includes("\\")
		) {
			reply(400, "Bad request");
			return;
		}
		if (path.split("/").includes("..")) {
			reply(403, "Forbidden");
			return;
		}
		try {
			let file = await realpath(resolve(root, `.${path}`));
			if (!confined(file)) {
				reply(403, "Forbidden");
				return;
			}
			const entry = await stat(file);
			if (entry.isDirectory()) {
				if (!path.endsWith("/")) {
					response.writeHead(301, {
						Location: `${rawPath}/${url.slice(rawPath.length)}`,
					});
					response.end();
					return;
				}
				file = await realpath(join(file, "index.html"));
			} else if (path.endsWith("/")) {
				reply(404, "Not found");
				return;
			}
			if (!confined(file)) {
				reply(403, "Forbidden");
				return;
			}
			if (!(await stat(file)).isFile()) {
				reply(404, "Not found");
				return;
			}
			const bytes = await readFile(file);
			const extension = entry.isDirectory()
				? ".html"
				: extname(path).toLowerCase();
			response.writeHead(200, {
				"Content-Type": contentTypes[extension] ?? "application/octet-stream",
				"Content-Length": bytes.length,
			});
			response.end(request.method === "HEAD" ? undefined : bytes);
		} catch (error) {
			const missing =
				error instanceof Error &&
				"code" in error &&
				(error.code === "ENOENT" || error.code === "ENOTDIR");
			reply(
				missing ? 404 : 500,
				missing ? "Not found" : "Internal server error",
			);
		}
	});
}

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const server = await createSiteServer(
		fileURLToPath(new URL("../dist/", import.meta.url)),
	);
	server.listen(4322, "127.0.0.1", () => {
		console.info("Site acceptance server listening on http://127.0.0.1:4322");
	});
}
