import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test, { describe } from "node:test";
import assert from "node:assert";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(testDirectory, "../..");
const mainPath = resolve(testDirectory, "../main.ts");
const fixturePath = (name: string) => resolve(testDirectory, "fixture", name);

function runCli(args: string[]) {
	return spawnSync(process.execPath, [mainPath, ...args], {
		encoding: "utf-8",
		env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
	});
}

describe("gic check", () => {
	test("validates a file without executing it or printing an AST", () => {
		const result = runCli(["check", fixturePath("runtime-invalid.gic")]);

		assert.strictEqual(result.status, 0);
		assert.strictEqual(result.stdout, "");
		assert.strictEqual(result.stderr, "");
	});

	test("reports a parse diagnostic without a stack trace", () => {
		const result = runCli(["check", fixturePath("bad-script.gic")]);

		assert.strictEqual(result.status, 1);
		assert.strictEqual(result.stdout, "");
		assert.strictEqual(
			result.stderr,
			"Error at line 2, column 1:\n" +
				"  \n" +
				"  ^\n" +
				"  Expected '}' after block.\n",
		);
	});

	test("reports an analysis diagnostic", () => {
		const result = runCli(["check", fixturePath("analysis-invalid.gic")]);

		assert.strictEqual(result.status, 1);
		assert.strictEqual(result.stdout, "");
		assert.strictEqual(
			result.stderr,
			"Error at line 1, column 1:\n" +
				"  ghost = 1;\n" +
				"  ^^^^^\n" +
				"  Cannot find name 'ghost'.\n",
		);
	});

	test("reports a missing file", () => {
		const missingPath = fixturePath("missing.gic");
		const result = runCli(["check", missingPath]);

		assert.strictEqual(result.status, 2);
		assert.strictEqual(result.stdout, "");
		assert.strictEqual(result.stderr, `File not found: ${missingPath}\n`);
	});

	test("requires exactly one file", () => {
		const missing = runCli(["check"]);
		const extra = runCli([
			"check",
			fixturePath("good-script.gic"),
			fixturePath("bad-script.gic"),
		]);

		assert.strictEqual(missing.status, 64);
		assert.strictEqual(missing.stdout, "");
		assert.strictEqual(
			missing.stderr,
			"Usage: gic check <file>\n       gic help\n",
		);
		assert.strictEqual(extra.status, 64);
		assert.strictEqual(extra.stdout, "");
		assert.strictEqual(
			extra.stderr,
			"Usage: gic check <file>\n       gic help\n",
		);
	});

	test("rejects unsupported commands", () => {
		const result = runCli(["unknown"]);

		assert.strictEqual(result.status, 64);
		assert.strictEqual(result.stdout, "");
		assert.strictEqual(
			result.stderr,
			"Unknown command: unknown\n\n" +
				"Usage: gic check <file>\n" +
				"       gic help\n",
		);
	});

	test("prints stable help", () => {
		const result = runCli(["help"]);

		assert.strictEqual(result.status, 0);
		assert.strictEqual(result.stderr, "");
		assert.strictEqual(
			result.stdout,
			"Usage: gic check <file>\n" +
				"       gic help\n\n" +
				"Commands:\n" +
				"  check <file>  Parse and analyze a GIC file without running it.\n" +
				"  help          Show this help.\n",
		);
	});

	test("is executable from an installed package", (t) => {
		const temporaryDirectory = mkdtempSync(resolve(tmpdir(), "gic-cli-test-"));
		const packageDirectory = resolve(temporaryDirectory, "package");
		const installDirectory = resolve(temporaryDirectory, "install");
		t.after(() => rmSync(temporaryDirectory, { recursive: true, force: true }));
		mkdirSync(installDirectory);

		const pack = spawnSync(
			process.platform === "win32" ? "pnpm.cmd" : "pnpm",
			["pack", "--pack-destination", packageDirectory],
			{
				cwd: projectDirectory,
				encoding: "utf-8",
			},
		);
		assert.strictEqual(
			pack.status,
			0,
			pack.stderr || pack.error?.message || "pnpm pack failed",
		);

		const tarballName = readdirSync(packageDirectory).find((name) =>
			name.endsWith(".tgz"),
		);
		assert.notStrictEqual(tarballName, undefined);

		const install = spawnSync(
			process.platform === "win32" ? "npm.cmd" : "npm",
			[
				"install",
				"--ignore-scripts",
				"--no-package-lock",
				"--no-save",
				resolve(packageDirectory, tarballName!),
			],
			{
				cwd: installDirectory,
				encoding: "utf-8",
			},
		);
		assert.strictEqual(
			install.status,
			0,
			install.stderr || install.error?.message || "npm install failed",
		);

		const executable = resolve(
			installDirectory,
			"node_modules",
			".bin",
			process.platform === "win32" ? "gic.cmd" : "gic",
		);
		const result = spawnSync(executable, [
			"check",
			fixturePath("runtime-invalid.gic"),
		]);
		assert.strictEqual(result.status, 0);
		assert.strictEqual(result.stdout.toString(), "");
		assert.strictEqual(result.stderr.toString(), "");
	});
});
