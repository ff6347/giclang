// ABOUTME: Stores GIC runtime variable bindings and resolves names through parent scopes.
// ABOUTME: Supports lexical environment chains used by the interpreter.

import type { LiteralValue } from "./ast.ts";

export class Environment {
	parent: Environment | null;
	variables: Map<string, LiteralValue>;

	constructor(parent: Environment | null) {
		this.parent = parent;
		this.variables = new Map();
	}

	get(name: string): LiteralValue | undefined {
		if (this.variables.has(name)) {
			return this.variables.get(name);
		}
		if (this.parent) {
			// this is a recursive call, so the parent environment will be searched for the variable
			return this.parent.get(name);
		}
		return undefined;
	}

	set(name: string, value: LiteralValue): void {
		this.variables.set(name, value);
	}
}
