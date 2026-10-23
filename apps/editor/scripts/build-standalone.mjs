// ABOUTME: Copies the shared browser runtime into the editor's export assets.
// ABOUTME: Uses the same self-contained bundle as site and blog previews.

import { copyFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const outputDirectory = resolve("public/standalone");
const runtime = fileURLToPath(
	import.meta.resolve("@giclang/runtime/standalone"),
);

await rm(outputDirectory, { force: true, recursive: true });
await mkdir(outputDirectory, { recursive: true });
await copyFile(runtime, resolve(outputDirectory, "runtime.js"));
