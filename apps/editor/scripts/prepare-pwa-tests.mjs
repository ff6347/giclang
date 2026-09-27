// ABOUTME: Builds two production service-worker revisions for update lifecycle tests.
// ABOUTME: Leaves the initial revision served while retaining the waiting revision as a fixture.

import { execFileSync } from "node:child_process";
import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../../../", import.meta.url));
const serviceWorker = fileURLToPath(new URL("../dist/sw.js", import.meta.url));
const fixtureDirectory = new URL("../.pwa-test/", import.meta.url);
const initialServiceWorker = new URL("sw-initial.js", fixtureDirectory);
const updatedServiceWorker = new URL("sw-updated.js", fixtureDirectory);

function build(version) {
	const options = {
		cwd: projectRoot,
		env: { ...process.env, GIC_PWA_TEST_VERSION: version },
		stdio: "inherit",
	};
	if (process.platform === "win32") {
		execFileSync(
			process.env["ComSpec"] ?? "cmd.exe",
			["/d", "/s", "/c", "pnpm build:browser"],
			options,
		);
		return;
	}
	execFileSync("pnpm", ["build:browser"], options);
}

await mkdir(fixtureDirectory, { recursive: true });
build("initial");
await copyFile(serviceWorker, initialServiceWorker);
build("updated");
await copyFile(serviceWorker, updatedServiceWorker);
await copyFile(initialServiceWorker, serviceWorker);
