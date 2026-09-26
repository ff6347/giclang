// ABOUTME: Configures Vite to serve and build the GIC browser shell.
// ABOUTME: Compiles and validates repository-authored product content.

import { readdir } from "node:fs/promises";
import { isAbsolute, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { validateExampleFiles } from "./browser/src/lib/content-model.ts";
import { compileMarkdown } from "./browser/src/lib/markdown-content.ts";

const CONTENT_ROOT = fileURLToPath(new URL("./content/", import.meta.url));
const PWA_DESCRIPTION = "Create static generative graphics with GIC.";

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
			const images: string[] = [];
			const content = compileMarkdown(path, source, (imagePath) => {
				const index = images.push(imagePath) - 1;
				return `__gic_image_${index}__`;
			});
			const imports = images.map(
				(imagePath, index) =>
					`import image${index} from ${JSON.stringify(`${imagePath.startsWith(".") ? imagePath : `./${imagePath}`}?url`)};`,
			);
			const replacements = images.map(
				(_, index) =>
					`content.html = content.html.replaceAll("__gic_image_${index}__", image${index});`,
			);
			return {
				code: [
					...imports,
					`const content = ${JSON.stringify(content)};`,
					...replacements,
					"export default content;",
				].join("\n"),
				map: null,
			};
		},
	};
}

const pwaTestVersion = process.env["GIC_PWA_TEST_VERSION"];
const pwaDescription =
	pwaTestVersion === undefined
		? PWA_DESCRIPTION
		: `${PWA_DESCRIPTION} ${pwaTestVersion}`;

export default defineConfig({
	plugins: [
		productContent(),
		VitePWA({
			injectRegister: null,
			registerType: "prompt",
			includeAssets: [
				"icons/gic-icon.svg",
				"icons/gic-icon-192.png",
				"icons/gic-icon-512.png",
			],
			manifest: {
				name: "GIC — Gestalten in Code",
				short_name: "GIC",
				description: pwaDescription,
				start_url: ".",
				scope: ".",
				display: "standalone",
				background_color: "#ffffff",
				theme_color: "#f0f0f0",
				icons: [
					{
						src: "icons/gic-icon-192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "any maskable",
					},
					{
						src: "icons/gic-icon-512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any maskable",
					},
				],
			},
			workbox: {
				cleanupOutdatedCaches: true,
				clientsClaim: false,
				globPatterns: ["**/*.{css,html,js,png,svg,ttf,webmanifest}"],
				maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
				skipWaiting: false,
			},
		}),
	],
	root: "browser",
});
