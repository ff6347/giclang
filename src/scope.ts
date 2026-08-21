// ABOUTME: Stores declarations belonging to one semantic scope.
// ABOUTME: Retains declaration tokens and kinds for semantic diagnostics.

import type { Token } from "./tokens.ts";

export interface Declaration {
	token: Token;
	kind: "function" | "variable";
}
export class Scope {
	declarations: Map<string, Declaration> = new Map();
}
