import { spawnSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
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

function writeSource(t: test.TestContext, source: string): string {
	const directory = mkdtempSync(resolve(tmpdir(), "gic-cli-source-"));
	const path = resolve(directory, "program.gic");
	writeFileSync(path, source);
	t.after(() => rmSync(directory, { recursive: true, force: true }));
	return path;
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
				"  loop {\n" +
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
			"Usage: gic check <file>\n" +
				"       gic run <file> [--commands]\n" +
				"       gic help\n",
		);
		assert.strictEqual(extra.status, 64);
		assert.strictEqual(extra.stdout, "");
		assert.strictEqual(
			extra.stderr,
			"Usage: gic check <file>\n" +
				"       gic run <file> [--commands]\n" +
				"       gic help\n",
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
				"       gic run <file> [--commands]\n" +
				"       gic help\n",
		);
	});

	test("rejects unsupported options without a stack trace", () => {
		const result = runCli(["check", "--unknown"]);

		assert.strictEqual(result.status, 64);
		assert.strictEqual(result.stdout, "");
		assert.strictEqual(
			result.stderr,
			"Unknown option '--unknown'. To specify a positional argument starting " +
				"with a '-', place it at the end of the command after '--', as in " +
				`'-- "--unknown"\n\n` +
				"Usage: gic check <file>\n" +
				"       gic run <file> [--commands]\n" +
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
				"       gic run <file> [--commands]\n" +
				"       gic help\n\n" +
				"Commands:\n" +
				"  check <file>             Parse and analyze a GIC file without running it.\n" +
				"  run <file>               Execute a GIC file headlessly.\n" +
				"  run <file> --commands    Write recorded drawing commands as JSON.\n" +
				"  help                     Show this help.\n",
		);
	});
});

describe("gic run", () => {
	test("writes print output without drawing commands", (t) => {
		const source = writeSource(t, 'print("hello");\ncircle(10, 20, 30);\n');
		const result = runCli(["run", source]);

		assert.strictEqual(result.status, 0);
		assert.strictEqual(result.stdout, "hello\n");
		assert.strictEqual(result.stderr, "");
	});

	test("writes multiple prints in execution order", (t) => {
		const source = writeSource(t, 'print("first");\nprint(2);\nprint(true);\n');
		const result = runCli(["run", source]);

		assert.strictEqual(result.status, 0);
		assert.strictEqual(result.stdout, "first\n2\ntrue\n");
		assert.strictEqual(result.stderr, "");
	});

	test("writes only command JSON when requested", (t) => {
		const source = writeSource(
			t,
			'print("hidden");\ncircle(10, 20, 30);\nrect(1, 2, 3, 4);\n',
		);
		const result = runCli(["run", source, "--commands"]);

		assert.strictEqual(result.status, 0);
		assert.strictEqual(
			result.stdout,
			'[{"type":"circle","x":10,"y":20,"radius":30},' +
				'{"type":"rect","x":1,"y":2,"width":3,"height":4}]\n',
		);
		assert.strictEqual(result.stderr, "");
	});

	test("reports parse and analysis diagnostics", (t) => {
		const parseInvalid = writeSource(t, "loop {");
		const analysisInvalid = writeSource(t, "ghost = 1;\n");

		const parseResult = runCli(["run", parseInvalid]);
		const analysisResult = runCli(["run", analysisInvalid]);

		assert.strictEqual(parseResult.status, 1);
		assert.strictEqual(parseResult.stdout, "");
		assert.strictEqual(
			parseResult.stderr,
			"Error at line 1, column 7:\n" +
				"  loop {\n" +
				"        ^\n" +
				"  Expected '}' after block.\n",
		);
		assert.strictEqual(analysisResult.status, 1);
		assert.strictEqual(analysisResult.stdout, "");
		assert.strictEqual(
			analysisResult.stderr,
			"Error at line 1, column 1:\n" +
				"  ghost = 1;\n" +
				"  ^^^^^\n" +
				"  Cannot find name 'ghost'.\n",
		);
	});

	test("preserves output before a runtime diagnostic", (t) => {
		const source = writeSource(t, 'print("before");\nlet value = 1 / 0;\n');
		const result = runCli(["run", source]);

		assert.strictEqual(result.status, 1);
		assert.strictEqual(result.stdout, "before\n");
		assert.strictEqual(
			result.stderr,
			"Error at line 2, column 15:\n" +
				'  print("before");\n' +
				"  let value = 1 / 0;\n" +
				"                ^\n" +
				"  Cannot divide by zero.\n",
		);
	});

	test("reports a missing file", () => {
		const missingPath = fixturePath("missing-run.gic");
		const result = runCli(["run", missingPath]);

		assert.strictEqual(result.status, 2);
		assert.strictEqual(result.stdout, "");
		assert.strictEqual(result.stderr, `File not found: ${missingPath}\n`);
	});

	test("rejects invalid arguments and options", (t) => {
		const source = writeSource(t, 'print("ok");\n');
		const missing = runCli(["run"]);
		const extra = runCli(["run", source, source]);
		const unsupported = runCli(["run", source, "--unknown"]);
		const commandsForCheck = runCli(["check", source, "--commands"]);

		for (const result of [missing, extra, unsupported, commandsForCheck]) {
			assert.strictEqual(result.status, 64);
			assert.strictEqual(result.stdout, "");
			assert.match(result.stderr, /Usage: gic check <file>\n       gic run/);
		}
	});

	test("is executable from an installed package", (t) => {
		const source = writeSource(t, 'print("installed");\n');
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
		const result = spawnSync(executable, ["run", source]);
		assert.strictEqual(result.status, 0);
		assert.strictEqual(result.stdout.toString(), "installed\n");
		assert.strictEqual(result.stderr.toString(), "");
	});
});
