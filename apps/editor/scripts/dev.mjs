// ABOUTME: Runs Vite alongside the compiled workspace packages it consumes.
// ABOUTME: Keeps package exports current while the shared editor is in development.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const workspace = fileURLToPath(new URL("../../../", import.meta.url));
const editor = fileURLToPath(new URL("../", import.meta.url));
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const commands = [
	{ args: ["--filter", "@giclang/core", "dev"], cwd: workspace },
	{ args: ["--filter", "@giclang/content", "dev"], cwd: workspace },
	{ args: ["exec", "vite", ...process.argv.slice(2)], cwd: editor },
];
const children = commands.map(({ args, cwd }) =>
	spawn(pnpm, args, { cwd, stdio: "inherit" }),
);
let stopping = false;

function stop(code) {
	if (stopping) return;
	stopping = true;
	process.exitCode = code;
	for (const child of children) {
		if (child.exitCode === null) child.kill();
	}
}

for (const child of children) {
	child.on("error", (error) => {
		console.error(error);
		stop(1);
	});
	child.on("exit", (code) => stop(code ?? 1));
}
process.on("SIGINT", () => stop(130));
process.on("SIGTERM", () => stop(143));
