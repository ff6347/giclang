// ABOUTME: Builds self-contained core-worker and Canvas-runtime assets for HTML export.
// ABOUTME: Keeps the standalone artifact aligned with the shared browser source modules.

import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "vite";

const outputDirectory = resolve("public/standalone");
const entries = [
	{
		entry: resolve("src/standalone-runtime.ts"),
		fileName: "runtime",
		name: "GicStandaloneRuntime",
	},
	{
		entry: resolve("src/standalone-worker.ts"),
		fileName: "worker",
		name: "GicStandaloneWorker",
	},
];

await rm(outputDirectory, { force: true, recursive: true });

for (const { entry, fileName, name } of entries) {
	await build({
		build: {
			emptyOutDir: false,
			lib: {
				entry,
				fileName: () => `${fileName}.js`,
				formats: ["iife"],
				name,
			},
			outDir: outputDirectory,
		},
		configFile: false,
		publicDir: false,
	});
}
