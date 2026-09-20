// ABOUTME: Configures Vite to serve and build the GIC browser shell.
// ABOUTME: Compiles and validates repository-authored product content.

import { readdir } from "node:fs/promises";
import { isAbsolute, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { validateExampleFiles } from "./browser/src/content-model.ts";
import { compileMarkdown } from "./browser/src/markdown-content.ts";

const CONTENT_ROOT = fileURLToPath(new URL("./content/", import.meta.url));

function isProductContent(path: string): boolean {
	const contentPath = relative(CONTENT_ROOT, path);
	return (
		contentPath !== "" &&
		!contentPath.startsWith("..") &&
		!isAbsolute(contentPath)
	);
}

function productContent(): Plugin {
	return {
		name: "gic-product-content",
		enforce: "pre",
		configureServer(server) {
			server.watcher.add(CONTENT_ROOT);
		},
		async hotUpdate({ file, server, timestamp, type }) {
			if (!isProductContent(file) || (type !== "create" && type !== "delete")) {
				return;
			}
			const contentModule =
				await server.moduleGraph.getModuleByUrl("/src/content.ts");
			if (contentModule !== undefined) {
				server.moduleGraph.invalidateModule(
					contentModule,
					new Set(),
					timestamp,
					true,
				);
			}
			server.ws.send({ path: "*", type: "full-reload" });
			return [];
		},
		async buildStart() {
			const exampleDirectories = await readdir(
				new URL("./content/examples/", import.meta.url),
				{ withFileTypes: true },
			);
			for (const directory of exampleDirectories) {
				if (directory.name.startsWith(".")) {
					continue;
				}
				if (!directory.isDirectory()) {
					this.error(
						`Example content entry '${directory.name}' must be a directory.`,
					);
				}
				const files = await readdir(
					new URL(`./content/examples/${directory.name}/`, import.meta.url),
				);
				validateExampleFiles(
					directory.name,
					new Set(files.filter((file) => !file.startsWith("."))),
				);
			}
		},
		transform(source, id) {
			const path = id.split("?")[0];
			if (
				path === undefined ||
				!path.endsWith(".md") ||
				!path.includes("/content/")
			) {
				return;
			}
			return {
				code: `export default ${JSON.stringify(compileMarkdown(path, source))};`,
				map: null,
			};
		},
	};
}

export default defineConfig({
	plugins: [productContent()],
	root: "browser",
});
