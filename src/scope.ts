// ABOUTME: Stores declarations belonging to one semantic scope.
// ABOUTME: Retains declaration tokens and kinds for semantic diagnostics.

import type { Token } from "./tokens.ts";

export type Declaration =
	| {
			token: Token;
			kind: "variable";
	  }
	| {
			token: Token;
			kind: "function";
			arity: number;
	  };

export class Scope {
	declarations: Map<string, Declaration> = new Map();
}
