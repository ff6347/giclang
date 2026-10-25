// ABOUTME: Builds browser modules and a self-contained GIC preview bundle.
// ABOUTME: Embeds a worker compiled from the workspace core into both formats.

import { fileURLToPath } from "node:url";
import { build } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const [worker] = await build({
	root,
	configFile: false,
	publicDir: false,
	build: {
		write: false,
		lib: {
			entry: fileURLToPath(new URL("../src/worker.ts", import.meta.url)),
			formats: ["iife"],
			name: "GicWorker",
		},
	},
});
const chunk = worker.output.find((item) => item.type === "chunk");

await build({
	root,
	configFile: false,
	publicDir: false,
	define: { GIC_WORKER_SOURCE: JSON.stringify(chunk.code) },
	build: {
		lib: {
			entry: fileURLToPath(new URL("../src/runtime.ts", import.meta.url)),
			formats: ["es", "iife"],
			name: "GicRuntime",
			fileName: (format) =>
				format === "es" ? "runtime.js" : "runtime.iife.js",
		},
	},
});
