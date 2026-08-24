export type { Program } from "./ast.ts";
import { Analyser } from "./analyzer.ts";
import type { Program } from "./ast.ts";
import type { Command } from "./commands.ts";
import { GicError, ParserError } from "./error.ts";
import { Interpreter } from "./interpreter.ts";
import { Lexer } from "./lexer.ts";
import { Parser } from "./parser.ts";

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
	| { ok: true; commands: Command[]; diagnostics: Diagnostic[] }
	| { ok: false; diagnostics: Diagnostic[] };

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
			diagnostics.push(e);
		} else {
			throw e;
		}
		return { ok: false, diagnostics };
	}
}

export function runSource(source: string): RunResult {
	const diagnostics: Diagnostic[] = [];
	try {
		const parsedSource = parseSource(source);
		diagnostics.push(...parsedSource.diagnostics);
		if (!parsedSource.ok) {
			return { ok: false, diagnostics };
		} else {
			const { program } = parsedSource;
			const analyser = new Analyser(program);
			const analysedResult = analyser.analyze();
			diagnostics.push(...analysedResult);
			if (diagnostics.length > 0) {
				return { ok: false, diagnostics };
			}
			const interpreter = new Interpreter(program);
			const commands = interpreter.interpret();
			return { ok: true, commands, diagnostics };
		}
	} catch (e: unknown) {
		if (e instanceof GicError || e instanceof ParserError) {
			diagnostics.push(e);
		} else {
			throw e;
		}
		return { ok: false, diagnostics };
	}
}
