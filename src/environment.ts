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

	/**
	 * Assigns a value to a variable in this environment or its parent.
	 * Returns true if the variable was assigned, false if not found.
	 */
	assign(name: string, value: LiteralValue): boolean {
		// update variables if the name is already defined
		// otherwise recurse into parent environment
		// if parent has no variable, return false

		// returns true if the variable was assigned, false if not found

		if (this.variables.has(name)) {
			this.variables.set(name, value);
			return true;
		}
		if (this.parent) {
			return this.parent.assign(name, value);
		} else {
			return false;
		}
	}

	set(name: string, value: LiteralValue): void {
		this.variables.set(name, value);
	}
}
