// ABOUTME: Serves production PWA assets with a controllable network-failure boundary.
// ABOUTME: Lets every browser prove cached operation while the application origin refuses requests.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`;
const contentTypes = new Map([
	[".css", "text/css; charset=utf-8"],
	[".html", "text/html; charset=utf-8"],
	[".js", "text/javascript; charset=utf-8"],
	[".json", "application/json; charset=utf-8"],
	[".md", "text/markdown; charset=utf-8"],
	[".png", "image/png"],
	[".svg", "image/svg+xml"],
	[".ttf", "font/ttf"],
	[".webmanifest", "application/manifest+json"],
]);
let offline = false;

function control(request, response, path) {
	if (request.method !== "POST") return false;
	if (path === "/__pwa_test_offline") offline = true;
	else if (path === "/__pwa_test_online") offline = false;
	else return false;
	response.writeHead(204).end();
	return true;
}

async function serve(request, response) {
	const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
	if (control(request, response, path)) return;
	if (offline) {
		response.writeHead(503, { "content-type": "text/plain; charset=utf-8" });
		response.end("Application origin unavailable.");
		return;
	}

	const relativePath = path === "/" ? "index.html" : path.slice(1);
	const filePath = normalize(join(root, relativePath));
	if (!filePath.startsWith(rootPrefix)) {
		response.writeHead(400).end();
		return;
	}

	try {
		const body = await readFile(filePath);
		const headers = {
			"cache-control": path === "/sw.js" ? "no-store" : "no-cache",
			"content-type":
				contentTypes.get(extname(filePath)) ?? "application/octet-stream",
		};
		response.writeHead(200, headers);
		response.end(body);
	} catch {
		response.writeHead(404).end();
	}
}

createServer((request, response) => {
	void serve(request, response);
}).listen(4173, "127.0.0.1", () => {
	console.info("PWA test server listening on http://127.0.0.1:4173");
});
