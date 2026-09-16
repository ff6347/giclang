// ABOUTME: Provides editor-neutral diagnostics, completion, hover, signatures, and formatting.
// ABOUTME: Derives language assistance from GIC parsing, scopes, and shared reference metadata.

import {
	builtInDescriptions,
	builtIns,
	type FunctionEntry,
} from "./built-ins.ts";
import { checkSource, type Diagnostic } from "./core.ts";
import { formatSource } from "./formatter.ts";
import {
	keywordDescriptions,
	keywords,
	type SyntaxKeywords,
} from "./keywords.ts";
import { visibleUserSymbols, type UserSymbol } from "./language-symbols.ts";
import { Lexer } from "./lexer.ts";
import type { Token } from "./tokens.ts";

export interface SourceRange {
	readonly start: number;
	readonly end: number;
}

export interface Completion {
	readonly documentation?: string;
	readonly kind:
		| "constant"
		| "function"
		| "keyword"
		| "user-function"
		| "variable";
	readonly label: string;
	readonly replacement: SourceRange;
	readonly signature?: string;
}

export interface Hover {
	readonly contents: readonly string[];
	readonly range: SourceRange;
}

export interface SignatureParameter {
	readonly label: string;
}

export interface SignatureInformation {
	readonly documentation?: string;
	readonly label: string;
	readonly parameters: readonly SignatureParameter[];
}

export interface SignatureHelp {
	readonly activeParameter: number;
	readonly activeSignature: number;
	readonly signatures: readonly SignatureInformation[];
}

export interface LanguageServiceSettings {
	readonly formatOnSave: boolean;
}

export const defaultLanguageServiceSettings: LanguageServiceSettings = {
	formatOnSave: true,
};

function normalizedPosition(source: string, position: number): number {
	return Math.max(0, Math.min(position, source.length));
}

function wordRange(source: string, position: number): SourceRange {
	let start = normalizedPosition(source, position);
	let end = start;
	while (start > 0 && /[A-Za-z0-9_]/.test(source[start - 1] ?? "")) {
		start--;
	}
	while (end < source.length && /[A-Za-z0-9_]/.test(source[end] ?? "")) {
		end++;
	}
	return { end, start };
}

function functionSignature(
	name: string,
	signature: FunctionEntry["signatures"][number],
): SignatureInformation {
	const parameters = signature.map(({ kind, name: parameterName }) => ({
		label: `${parameterName}: ${kind}`,
	}));
	return {
		label: `${name}(${parameters.map(({ label }) => label).join(", ")})`,
		parameters,
	};
}

function userFunctionSignature(
	symbol: Extract<UserSymbol, { kind: "function" }>,
) {
	const parameters = symbol.parameters.map((label) => ({ label }));
	return {
		label: `${symbol.name}(${symbol.parameters.join(", ")})`,
		parameters,
	};
}

function declarationPosition(source: string, range: SourceRange): boolean {
	let tokens: Token[];
	try {
		tokens = new Lexer(source.slice(0, range.start)).scanTokens();
	} catch {
		return false;
	}
	const significant = tokens.filter(({ type }) => type !== "EOF");
	const previous = significant.at(-1);
	if (previous?.type === "LET" || previous?.type === "FUNC") {
		return true;
	}

	const openParentheses: number[] = [];
	for (const [index, token] of significant.entries()) {
		if (token.type === "LEFT_PAREN") {
			openParentheses.push(index);
		} else if (token.type === "RIGHT_PAREN") {
			openParentheses.pop();
		}
	}
	const openIndex = openParentheses.at(-1);
	if (openIndex === undefined) {
		return false;
	}
	const beforeOpen = significant[openIndex - 1];
	const beforeName = significant[openIndex - 2];
	if (beforeName?.type === "FUNC") {
		return true;
	}
	if (beforeOpen?.type !== "REPEAT") {
		return false;
	}
	return !significant.slice(openIndex + 1).some(({ type }) => type === "COMMA");
}

export function diagnoseSource(source: string): Diagnostic[] {
	return checkSource(source).diagnostics;
}

export function completeSource(source: string, position: number): Completion[] {
	const currentPosition = normalizedPosition(source, position);
	const replacement = wordRange(source, currentPosition);
	if (declarationPosition(source, replacement)) {
		return [];
	}

	const completions: Completion[] = [];
	for (const name of Object.keys(keywords) as SyntaxKeywords[]) {
		completions.push({
			documentation: keywordDescriptions[name],
			kind: "keyword",
			label: name,
			replacement,
		});
	}
	for (const [name, entry] of Object.entries(builtIns)) {
		if (entry.kind === "constant") {
			completions.push({
				documentation: builtInDescriptions[name as keyof typeof builtIns],
				kind: "constant",
				label: name,
				replacement,
			});
		} else {
			completions.push({
				documentation: builtInDescriptions[name as keyof typeof builtIns],
				kind: "function",
				label: name,
				replacement,
				signature: functionSignature(name, entry.signatures[0] ?? []).label,
			});
		}
	}
	for (const symbol of visibleUserSymbols(source, currentPosition)) {
		completions.push({
			kind: symbol.kind === "function" ? "user-function" : "variable",
			label: symbol.name,
			replacement,
			...(symbol.kind === "function"
				? { signature: userFunctionSignature(symbol).label }
				: {}),
		});
	}
	return completions.sort(({ label: left }, { label: right }) =>
		left.localeCompare(right),
	);
}

export function hoverSource(
	source: string,
	position: number,
): Hover | undefined {
	const range = wordRange(source, position);
	const name = source.slice(range.start, range.end);
	if (Object.hasOwn(keywords, name)) {
		const keyword = name as SyntaxKeywords;
		return {
			contents: [keyword, keywordDescriptions[keyword]],
			range,
		};
	}
	if (Object.hasOwn(builtIns, name)) {
		const builtInName = name as keyof typeof builtIns;
		const entry = builtIns[builtInName];
		const detail =
			entry.kind === "function"
				? functionSignature(name, entry.signatures[0] ?? []).label
				: `${entry.valueKind} constant ${name}`;
		return {
			contents: [detail, builtInDescriptions[builtInName]],
			range,
		};
	}
	const symbol = visibleUserSymbols(source, range.start).find(
		(candidate) => candidate.name === name,
	);
	if (symbol === undefined) {
		return undefined;
	}
	return {
		contents: [
			symbol.kind === "function"
				? userFunctionSignature(symbol).label
				: `${symbol.kind === "repeat-variable" ? "repeat variable" : "variable"} ${symbol.name}`,
		],
		range,
	};
}

function activeCall(
	source: string,
	position: number,
): { activeParameter: number; name: string } | undefined {
	let tokens: Token[];
	try {
		tokens = new Lexer(source.slice(0, position)).scanTokens();
	} catch {
		return undefined;
	}
	const significant = tokens.filter(({ type }) => type !== "EOF");
	const calls: { activeParameter: number; name: string }[] = [];
	for (const [index, token] of significant.entries()) {
		if (token.type === "LEFT_PAREN") {
			const previous = significant[index - 1];
			calls.push({
				activeParameter: 0,
				name: previous?.type === "IDENTIFIER" ? previous.lexeme : "",
			});
		} else if (token.type === "COMMA") {
			const call = calls.at(-1);
			if (call !== undefined) {
				call.activeParameter++;
			}
		} else if (token.type === "RIGHT_PAREN") {
			calls.pop();
		}
	}
	const call = calls.at(-1);
	return call?.name ? call : undefined;
}

export function signatureHelpSource(
	source: string,
	position: number,
): SignatureHelp | undefined {
	const currentPosition = normalizedPosition(source, position);
	const call = activeCall(source, currentPosition);
	if (call === undefined) {
		return undefined;
	}
	if (Object.hasOwn(builtIns, call.name)) {
		const name = call.name as keyof typeof builtIns;
		const entry = builtIns[name];
		if (entry.kind !== "function") {
			return undefined;
		}
		const matchingSignature = entry.signatures.findIndex(
			(signature) => signature.length > call.activeParameter,
		);
		const activeSignature =
			matchingSignature === -1
				? Math.max(0, entry.signatures.length - 1)
				: matchingSignature;
		return {
			activeParameter: call.activeParameter,
			activeSignature,
			signatures: entry.signatures.map((signature) => ({
				...functionSignature(name, signature),
				documentation: builtInDescriptions[name],
			})),
		};
	}
	const symbol = visibleUserSymbols(source, currentPosition).find(
		(candidate): candidate is Extract<UserSymbol, { kind: "function" }> =>
			candidate.kind === "function" && candidate.name === call.name,
	);
	if (symbol === undefined) {
		return undefined;
	}
	return {
		activeParameter: call.activeParameter,
		activeSignature: 0,
		signatures: [userFunctionSignature(symbol)],
	};
}

export function formatSourceDocument(source: string): string {
	return formatSource(source);
}

export function applySaveFormatting(
	source: string,
	settings: LanguageServiceSettings,
): string {
	return settings.formatOnSave ? formatSourceDocument(source) : source;
}
