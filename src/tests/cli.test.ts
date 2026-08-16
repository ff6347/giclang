import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test, { describe } from "node:test";
import assert from "node:assert";

function scriptRunner(pathToScript: string) {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	const scriptPath = resolve(__dirname, pathToScript);
	const mainPath = resolve(__dirname, "../main.ts");

	const result = spawnSync("node", [mainPath, scriptPath], {
		encoding: "utf-8",
		env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
	});
	return result;
}

describe("cli", () => {
	test("should report error without stack trace", () => {
		const result = scriptRunner("./fixture/bad-script.gic");
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

	test("should exit with 0 and print parsed program to stdout.", (t) => {
		const result = scriptRunner("./fixture/good-script.gic");

		assert.strictEqual(result.status, 0);
		assert.strictEqual(result.stderr, "");
		t.assert.snapshot(result.stdout);
	});
});
