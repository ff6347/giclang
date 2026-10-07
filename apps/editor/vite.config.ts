// ABOUTME: Configures Vite to serve and build the GIC browser shell.
// ABOUTME: Compiles and validates repository-authored product content.

import { readdir } from "node:fs/promises";
import { isAbsolute, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { validateExampleFiles } from "@giclang/content/model";
import { readGicAgentSkill } from "@giclang/content/node";
import {
	compileMarkdown,
	compileSkillDocumentation,
} from "@giclang/content/markdown";

const CONTENT_ROOT = fileURLToPath(
	new URL("../../packages/content/content/", import.meta.url),
);
const SKILL_GUIDE_PATH = fileURLToPath(
	new URL("../../packages/content/content/docs/skill.md", import.meta.url),
);
const SKILL_SOURCE_PATH = fileURLToPath(
	new URL(
		"../../packages/content/content/skills/gic-agent/SKILL.md",
		import.meta.url,
	),
);
const LANGUAGE_REFERENCE_PATH = fileURLToPath(
	new URL(
		"../../packages/content/content/skills/gic-agent/references/language.md",
		import.meta.url,
	),
);
const SKILL_SOURCE_PATHS = new Set([
	SKILL_SOURCE_PATH,
	LANGUAGE_REFERENCE_PATH,
]);
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
		hotUpdate({ file, server, type }) {
			if (SKILL_SOURCE_PATHS.has(file)) {
				const skillModules =
					server.moduleGraph.getModulesByFile(SKILL_GUIDE_PATH);
				if (skillModules === undefined) return [];
				for (const module of skillModules) {
					server.moduleGraph.invalidateModule(module);
				}
				return [...skillModules];
			}
			if (!isProductContent(file) || (type !== "create" && type !== "delete")) {
				return;
			}
			server.ws.send({ path: "*", type: "full-reload" });
			return [];
		},
		async buildStart() {
			const exampleDirectories = await readdir(
				new URL("../../packages/content/content/examples/", import.meta.url),
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
					new URL(
						`../../packages/content/content/examples/${directory.name}/`,
						import.meta.url,
					),
				);
				validateExampleFiles(
					directory.name,
					new Set(files.filter((file) => !file.startsWith("."))),
				);
			}
		},
		async transform(source, id) {
			if (id.includes("?raw")) {
				return;
			}
			const path = id.split("?")[0];
			if (
				path === undefined ||
				!path.endsWith(".md") ||
				!path.includes("/content/")
			) {
				return;
			}
			if (path === SKILL_GUIDE_PATH) {
				this.addWatchFile(SKILL_SOURCE_PATH);
				this.addWatchFile(LANGUAGE_REFERENCE_PATH);
			}
			const images: string[] = [];
			const resolveImage = (imagePath: string): string => {
				const index = images.push(imagePath) - 1;
				return `__gic_image_${index}__`;
			};
			const content =
				path === SKILL_GUIDE_PATH
					? await readGicAgentSkill().then(({ skillSource, referenceSource }) =>
							compileSkillDocumentation(
								"docs/skill.md",
								source,
								skillSource,
								referenceSource,
								resolveImage,
							),
						)
					: compileMarkdown(path, source, resolveImage);
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
	root: ".",
});
