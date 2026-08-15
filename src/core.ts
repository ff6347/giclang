export type { Program } from "./ast.ts";
import type { Program } from "./ast.ts";
import { GicError, ParserError } from "./error.ts";
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
