// ABOUTME: All reserved words go in here
// ABOUTME: Shared keyword table for the lexer plus reservedNames derived from keywords and built-ins.
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

export const keywordDescriptions: Readonly<Record<SyntaxKeywords, string>> = {
	else: "Run a block when the preceding if condition is false.",
	false: "The boolean false value.",
	func: "Declare a reusable function.",
	if: "Run a block when a condition is true.",
	let: "Declare a variable.",
	loop: "Run a block once per animation frame.",
	null: "The null value.",
	repeat: "Run a block over a numeric range.",
	return: "Leave a function with an optional value.",
	true: "The boolean true value.",
};

export const reservedNames: ReadonlySet<string> = new Set([
	...Object.keys(builtIns),
	...Object.keys(keywords),
]);
