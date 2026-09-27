#!/usr/bin/env node

import { argv, cwd } from "node:process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { report } from "./message-formatter.ts";
import { checkSource, runSource, type Diagnostic } from "@giclang/core";

const USAGE =
	"Usage: gic check <file>\n       gic run <file> [--commands]\n       gic help";
const HELP = `${USAGE}

Commands:
  check <file>             Parse and analyze a GIC file without running it.
  run <file>               Execute a GIC file headlessly.
  run <file> --commands    Write recorded drawing commands as JSON.
  help                     Show this help.`;

function main(args: string[]): number {
	let positionals: string[];
	let commands: boolean | undefined;
	try {
		({
			positionals,
			values: { commands },
		} = parseArgs({
			args,
			allowPositionals: true,
			strict: true,
			options: {
				commands: { type: "boolean" },
			},
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
		if (commandArgs.length > 0 || commands !== undefined) {
			console.error(USAGE);
			return 64;
		}
		console.info(HELP);
		return 0;
	}

	if (command === "check") {
		if (
			commandArgs.length !== 1 ||
			commandArgs[0] === undefined ||
			commands !== undefined
		) {
			console.error(USAGE);
			return 64;
		}
		return checkFile(commandArgs[0]);
	}

	if (command === "run") {
		if (commandArgs.length !== 1 || commandArgs[0] === undefined) {
			console.error(USAGE);
			return 64;
		}
		return runFile(commandArgs[0], commands === true);
	}

	if (command === undefined) {
		console.error(USAGE);
	} else {
		console.error(`Unknown command: ${command}\n\n${USAGE}`);
	}
	return 64;
}

function checkFile(pathToFile: string): number {
	const source = readSource(pathToFile);
	if (source === undefined) {
		return 2;
	}

	const result = checkSource(source);
	if (!result.ok) {
		printDiagnostics(result.diagnostics, source);
		return 1;
	}

	return 0;
}

function runFile(pathToFile: string, showCommands: boolean): number {
	const source = readSource(pathToFile);
	if (source === undefined) {
		return 2;
	}

	const result = runSource(source);
	if (!showCommands) {
		for (const entry of result.output) {
			console.info(entry.text);
		}
	}
	if (!result.ok) {
		printDiagnostics(result.diagnostics, source);
		return 1;
	}
	if (showCommands) {
		console.info(JSON.stringify(result.commands));
	}
	return 0;
}

function readSource(pathToFile: string): string | undefined {
	const absolutePath = resolve(cwd(), pathToFile);
	try {
		return readFileSync(absolutePath, "utf-8");
	} catch (error: unknown) {
		if (isMissingFileError(error)) {
			console.error(`File not found: ${absolutePath}`);
		} else {
			console.error(`Cannot read file: ${absolutePath}`);
		}
		return undefined;
	}
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
