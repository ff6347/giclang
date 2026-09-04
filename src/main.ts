import { argv, exit, cwd } from "node:process";
import { existsSync, readFileSync } from "node:fs";
import { styleText } from "node:util";
import { resolve } from "node:path";
import { report } from "./message-formatter.ts";
import { parseSource } from "./core.ts";

async function main() {
	const args = argv.slice(2);
	if (args.length > 1) {
		helpAndExit();
	} else if (args.length === 1 && args[0] !== undefined) {
		runFile(args[0]);
	} else {
		runPrompt();
	}
}

await main();

function helpAndExit() {
	console.info("Usage: gic [script]");
	exit(64);
}

async function runFile(pathToFile: string): Promise<void> {
	let source: string = "";

	const absolutePath = resolve(cwd(), pathToFile);
	if (existsSync(absolutePath)) {
		source = readFileSync(absolutePath, "utf-8");
		const result = parseSource(source);
		if (!result.ok) {
			result.diagnostics.forEach((diagnostic) => {
				console.error(
					styleText(
						["red"],
						report({
							start: diagnostic.start,
							end: diagnostic.end,
							message: diagnostic.message,
							source,
						}),
					),
				);
			});
			exit(1);
		} else {
			console.info(result.program);
		}
	} else {
		console.error(
			styleText(["black", "bgWhiteBright"], `File not found: ${absolutePath}`),
		);
		exit(2);
	}
}

async function runPrompt(): Promise<void> {}
