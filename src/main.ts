import { argv, exit, cwd } from "node:process";
import { existsSync, readFileSync } from "node:fs";
import { styleText } from "node:util";
import { resolve } from "node:path";
import { Lexer } from "./lexer.ts";
import { GicError } from "./error.ts";
import { EOF } from "./tokens.ts";
import { Parser } from "./parser.ts";

async function main() {
	const args = argv.slice(2);
	console.log();
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
	try {
		console.log(`Running file: ${pathToFile}`);

		const absolutePath = resolve(cwd(), pathToFile);
		if (existsSync(absolutePath)) {
			const source = readFileSync(absolutePath, "utf-8");
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
		if (e instanceof GicError) {
			error(e);
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
	// console.log(tokens);
}

function error(e: GicError): void {
	if (e.token?.type && e.token.type === EOF) {
		report(e.line, " at end", e.message);
	} else {
		report(e.line, ` at '${e.token?.lexeme}'`, e.message);
	}
}

function report(line: number, where: string, message: string): void {
	console.error(
		styleText(["red"], `[Line ${line}] Error ${where}: ${message}`),
	);
	exit(1);
}
