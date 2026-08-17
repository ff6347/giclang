// ABOUTME: All reserved words go in here
import { builtIns } from "./built-ins.ts";
import type { TokenType } from "./tokens.ts";

export type SyntaxKeywords =
	| "else"
	| "false"
	| "true"
	| "if"
	| "return"
	| "let"
	| "repeat"
	| "func"
	| "loop"
	| "null";

export type Keywords = Record<SyntaxKeywords, TokenType>;

export const keywords: Keywords = {
	else: "ELSE",
	false: "FALSE",
	true: "TRUE",
	if: "IF",
	return: "RETURN",
	let: "LET",
	repeat: "REPEAT",
	func: "FUNC",
	loop: "LOOP",
	null: "NULL",
};

export const reservedNames: ReadonlySet<string> = new Set([
	...Object.keys(builtIns),
	...Object.keys(keywords),
]);
