#!/usr/bin/env node

import { argv, cwd } from "node:process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { report } from "./message-formatter.ts";
import { checkSource, type Diagnostic } from "./core.ts";

const USAGE = "Usage: gic check <file>\n       gic help";
const HELP = `${USAGE}

Commands:
  check <file>  Parse and analyze a GIC file without running it.
  help          Show this help.`;

function main(args: string[]): number {
	let positionals: string[];
	try {
		({ positionals } = parseArgs({
			args,
			allowPositionals: true,
			strict: true,
		}));
	} catch (error: unknown) {
		if (isParseArgsError(error)) {
			console.error(`${error.message}\n\n${USAGE}`);
			return 64;
		}
		throw error;
	}

	const [command, ...commandArgs] = positionals;

	if (command === "help") {
		if (commandArgs.length > 0) {
			console.error(USAGE);
			return 64;
		}
		console.info(HELP);
		return 0;
	}

	if (command === "check") {
		if (commandArgs.length !== 1 || commandArgs[0] === undefined) {
			console.error(USAGE);
			return 64;
		}
		return checkFile(commandArgs[0]);
	}

	if (command === undefined) {
		console.error(USAGE);
	} else {
		console.error(`Unknown command: ${command}\n\n${USAGE}`);
	}
	return 64;
}

function checkFile(pathToFile: string): number {
	const absolutePath = resolve(cwd(), pathToFile);
	let source: string;
	try {
		source = readFileSync(absolutePath, "utf-8");
	} catch (error: unknown) {
		if (isMissingFileError(error)) {
			console.error(`File not found: ${absolutePath}`);
		} else {
			console.error(`Cannot read file: ${absolutePath}`);
		}
		return 2;
	}

	const result = checkSource(source);
	if (!result.ok) {
		printDiagnostics(result.diagnostics, source);
		return 1;
	}

	return 0;
}

function printDiagnostics(diagnostics: Diagnostic[], source: string): void {
	for (const diagnostic of diagnostics) {
		console.error(
			report({
				start: diagnostic.start,
				end: diagnostic.end,
				message: diagnostic.message,
				source,
			}),
		);
	}
}

function isMissingFileError(error: unknown): boolean {
	return (
		error instanceof Error &&
		"code" in error &&
		(error.code === "ENOENT" || error.code === "ENOTDIR")
	);
}

function isParseArgsError(error: unknown): error is Error {
	return (
		error instanceof TypeError &&
		"code" in error &&
		typeof error.code === "string" &&
		error.code.startsWith("ERR_PARSE_ARGS_")
	);
}

process.exitCode = main(argv.slice(2));
