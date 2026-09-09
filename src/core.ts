export type { Program } from "./ast.ts";
export type { Command } from "./commands.ts";

import { Analyser } from "./analyzer.ts";
import type { Program } from "./ast.ts";
import type { Command } from "./commands.ts";
import { GicError, ParserError } from "./error.ts";
import { Interpreter } from "./interpreter.ts";
import { Lexer } from "./lexer.ts";
import type { OutputEntry } from "./output.ts";
import { Parser } from "./parser.ts";
export type { OutputEntry } from "./output.ts";
export interface Diagnostic {
	message: string;
	line: number;
	start: number;
	end: number;
}
export type ParseResult =
	| { ok: true; program: Program; diagnostics: Diagnostic[] }
	| { ok: false; diagnostics: Diagnostic[] };

export type RunResult =
	| {
			ok: true;
			commands: Command[];
			diagnostics: Diagnostic[];
			output: OutputEntry[];
	  }
	| { ok: false; diagnostics: Diagnostic[]; output: OutputEntry[] };

export function parseSource(source: string): ParseResult {
	const diagnostics: Diagnostic[] = [];
	try {
		const lexer = new Lexer(source);
		const tokens = lexer.scanTokens();
		const parser = new Parser(tokens);
		const program = parser.parse();
		return { ok: true, diagnostics, program };
	} catch (e: unknown) {
		if (e instanceof GicError || e instanceof ParserError) {
			diagnostics.push({
				message: e.message,
				line: e.line,
				start: e.start,
				end: e.end,
			});
		} else {
			throw e;
		}
		return { ok: false, diagnostics };
	}
}

export function runSource(source: string): RunResult {
	const diagnostics: Diagnostic[] = [];
	const output: OutputEntry[] = [];
	try {
		const parsedSource = parseSource(source);
		diagnostics.push(...parsedSource.diagnostics);
		if (!parsedSource.ok) {
			return { ok: false, diagnostics, output };
		} else {
			const { program } = parsedSource;
			const analyser = new Analyser(program);
			const analysedResult = analyser.analyze();
			diagnostics.push(...analysedResult);
			if (diagnostics.length > 0) {
				return { ok: false, diagnostics, output };
			}
			const interpreter = new Interpreter(program, (entry) => {
				output.push(entry);
			});
			const commands = interpreter.interpret();
			return { ok: true, commands, diagnostics, output };
		}
	} catch (e: unknown) {
		if (e instanceof GicError || e instanceof ParserError) {
			diagnostics.push({
				message: e.message,
				line: e.line,
				start: e.start,
				end: e.end,
			});
		} else {
			throw e;
		}
		return { ok: false, diagnostics, output };
	}
}
