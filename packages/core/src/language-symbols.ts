// ABOUTME: Resolves user declarations that are visible at a source position.
// ABOUTME: Applies GIC's analyzer scope and declaration-order rules to parsed programs.

import type { FuncStmt, Program, RepeatStmt, Statement } from "./ast.ts";
import { parseSource } from "./core.ts";

export type UserSymbol =
	| {
			readonly declaredAt: number;
			readonly kind: "function";
			readonly name: string;
			readonly parameters: readonly string[];
			readonly range: ScopeRange;
			readonly scope: ScopeRange;
	  }
	| {
			readonly declaredAt: number;
			readonly kind: "variable" | "repeat-variable";
			readonly name: string;
			readonly range: ScopeRange;
			readonly scope: ScopeRange;
	  };

interface ScopeRange {
	readonly start: number;
	end: number;
}

function scanBlocks(source: string): {
	scopes: ScopeRange[];
	unclosedCount: number;
} {
	const scopes: ScopeRange[] = [];
	const openBlocks: ScopeRange[] = [];
	let inComment = false;
	let inString = false;

	for (let index = 0; index < source.length; index++) {
		const character = source[index];
		if (inComment) {
			if (character === "\n") {
				inComment = false;
			}
			continue;
		}
		if (inString) {
			if (character === '"') {
				inString = false;
			}
			continue;
		}
		if (character === "/" && source[index + 1] === "/") {
			inComment = true;
			index++;
		} else if (character === '"') {
			inString = true;
		} else if (character === "{") {
			const block = { end: source.length, start: index + 1 };
			scopes.push(block);
			openBlocks.push(block);
		} else if (character === "}") {
			const block = openBlocks.pop();
			if (block !== undefined) {
				block.end = index;
			}
		}
	}
	return { scopes, unclosedCount: openBlocks.length };
}

function recoverProgram(source: string, position: number): Program | undefined {
	const parsed = parseSource(source);
	if (parsed.ok) {
		return parsed.program;
	}

	const candidateEnds = new Set<number>();
	for (let index = 0; index < position; index++) {
		if (source[index] === "}" || source[index] === ";") {
			candidateEnds.add(index + 1);
		}
	}
	for (const { start } of scanBlocks(source.slice(0, position)).scopes) {
		candidateEnds.add(start);
	}
	const orderedCandidateEnds = [...candidateEnds].sort(
		(left, right) => left - right,
	);
	for (let index = orderedCandidateEnds.length - 1; index >= 0; index--) {
		const candidateEnd = orderedCandidateEnds[index];
		if (candidateEnd === undefined) {
			continue;
		}
		const candidate = source.slice(0, candidateEnd);
		const { unclosedCount } = scanBlocks(candidate);
		const recovered = parseSource(`${candidate}${"\n}".repeat(unclosedCount)}`);
		if (recovered.ok) {
			return recovered.program;
		}
	}
	return undefined;
}

function blockScopes(source: string): ScopeRange[] {
	return scanBlocks(source).scopes;
}

function statementEnd(source: string, start: number): number {
	let inComment = false;
	let inString = false;

	for (let index = start; index < source.length; index++) {
		const character = source[index];
		if (inComment) {
			if (character === "\n") {
				inComment = false;
			}
			continue;
		}
		if (inString) {
			if (character === '"') {
				inString = false;
			}
			continue;
		}
		if (character === "/" && source[index + 1] === "/") {
			inComment = true;
			index++;
		} else if (character === '"') {
			inString = true;
		} else if (character === ";") {
			return index + 1;
		}
	}
	return source.length;
}

function innermostScope(
	scopes: ScopeRange[],
	position: number,
	globalScope: ScopeRange,
): ScopeRange {
	let found = globalScope;
	for (const scope of scopes) {
		if (
			scope.start <= position &&
			position <= scope.end &&
			scope.start >= found.start
		) {
			found = scope;
		}
	}
	return found;
}

function followingBlock(
	scopes: ScopeRange[],
	declarationToken: { readonly end: number },
): ScopeRange | undefined {
	return scopes.find(({ start }) => start > declarationToken.end);
}

function collectStatementSymbols(
	statement: Statement,
	source: string,
	scopes: ScopeRange[],
	globalScope: ScopeRange,
	symbols: UserSymbol[],
): void {
	switch (statement.type) {
		case "VarDecl": {
			symbols.push({
				declaredAt: statementEnd(source, statement.name.end),
				kind: "variable",
				name: statement.name.lexeme,
				range: { end: statement.name.end, start: statement.name.start },
				scope: innermostScope(scopes, statement.name.start, globalScope),
			});
			return;
		}
		case "FuncStmt": {
			collectFunctionSymbols(statement, source, scopes, globalScope, symbols);
			return;
		}
		case "RepeatStmt": {
			collectRepeatSymbols(statement, source, scopes, globalScope, symbols);
			return;
		}
		case "IfStmt": {
			statement.thenBranch.forEach((child) => {
				collectStatementSymbols(child, source, scopes, globalScope, symbols);
			});
			statement.elseBranch?.forEach((child) => {
				collectStatementSymbols(child, source, scopes, globalScope, symbols);
			});
			return;
		}
		case "Assignment":
		case "ExprStmt":
		case "ReturnStmt":
			return;
	}
}

function collectFunctionSymbols(
	statement: FuncStmt,
	source: string,
	scopes: ScopeRange[],
	globalScope: ScopeRange,
	symbols: UserSymbol[],
): void {
	symbols.push({
		declaredAt: statement.name.start,
		kind: "function",
		name: statement.name.lexeme,
		parameters: statement.params?.map(({ lexeme }) => lexeme) ?? [],
		range: { end: statement.name.end, start: statement.name.start },
		scope: globalScope,
	});
	const functionScope = followingBlock(scopes, statement.name);
	if (functionScope !== undefined) {
		for (const parameter of statement.params ?? []) {
			symbols.push({
				declaredAt: functionScope.start,
				kind: "variable",
				name: parameter.lexeme,
				range: { end: parameter.end, start: parameter.start },
				scope: functionScope,
			});
		}
	}
	statement.body.forEach((child) => {
		collectStatementSymbols(child, source, scopes, globalScope, symbols);
	});
}

function collectRepeatSymbols(
	statement: RepeatStmt,
	source: string,
	scopes: ScopeRange[],
	globalScope: ScopeRange,
	symbols: UserSymbol[],
): void {
	const repeatScope = followingBlock(scopes, statement.variable);
	if (repeatScope !== undefined) {
		symbols.push({
			declaredAt: repeatScope.start,
			kind: "repeat-variable",
			name: statement.variable.lexeme,
			range: { end: statement.variable.end, start: statement.variable.start },
			scope: repeatScope,
		});
	}
	statement.body.forEach((child) => {
		collectStatementSymbols(child, source, scopes, globalScope, symbols);
	});
}

export function visibleUserSymbols(
	source: string,
	position: number,
): UserSymbol[] {
	const program = recoverProgram(source, position);
	if (program === undefined) {
		return [];
	}

	const globalScope = { end: source.length, start: 0 };
	const scopes = blockScopes(source);
	const symbols: UserSymbol[] = [];
	program.statements.forEach((statement) => {
		collectStatementSymbols(statement, source, scopes, globalScope, symbols);
	});
	program.loopStatement?.body.forEach((statement) => {
		collectStatementSymbols(statement, source, scopes, globalScope, symbols);
	});

	return symbols.filter(
		(symbol) =>
			(symbol.range.start <= position && position < symbol.range.end) ||
			(symbol.declaredAt <= position &&
				symbol.scope.start <= position &&
				position <= symbol.scope.end),
	);
}
