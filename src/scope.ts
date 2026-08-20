// ABOUTME: Stores declarations belonging to one semantic scope.
// ABOUTME: Retains declaration tokens for name-resolution diagnostics.
import type { Token } from "./tokens.ts";

export class Scope {
	declarations: Map<string, Token> = new Map();
}
