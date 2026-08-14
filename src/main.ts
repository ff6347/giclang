import { argv, exit, cwd } from "node:process";
import { existsSync, readFileSync } from "node:fs";
import { styleText } from "node:util";
import { resolve } from "node:path";
import { Lexer } from "./lexer.ts";
import { GicError, ParserError } from "./error.ts";
import { Parser } from "./parser.ts";
import { error } from "./message-formatter.ts";

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
	console.log("Usage: gic [script]");
	exit(64);
}

async function runFile(pathToFile: string): Promise<void> {
	let source: string = "";
	try {
		const absolutePath = resolve(cwd(), pathToFile);
		if (existsSync(absolutePath)) {
			source = readFileSync(absolutePath, "utf-8");
			run(source);
		} else {
			console.error(
				styleText(
					["black", "bgWhiteBright"],
					`File not found: ${absolutePath}`,
				),
			);
			exit(2);
		}
	} catch (e: unknown) {
		if (e instanceof GicError || e instanceof ParserError) {
			const report = error(e, source);
			console.error(styleText(["red"], report));
			exit(1);
		} else {
			throw e;
		}
	}
}

async function runPrompt(): Promise<void> {}

function run(source: string): void {
	const lexer = new Lexer(source);
	const tokens = lexer.scanTokens();
	const parser = new Parser(tokens);
	const ast = parser.parse();
	console.log(ast);
}
