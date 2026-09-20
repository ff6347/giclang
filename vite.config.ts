// ABOUTME: Configures Vite to serve and build the GIC browser shell.
// ABOUTME: Compiles and validates repository-authored product content.

import { readdir } from "node:fs/promises";
import { defineConfig, type Plugin } from "vite";
import { validateExampleFiles } from "./browser/src/content-model.ts";
import { compileMarkdown } from "./browser/src/markdown-content.ts";

function productContent(): Plugin {
	return {
		name: "gic-product-content",
		enforce: "pre",
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
