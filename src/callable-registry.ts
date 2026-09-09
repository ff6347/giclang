// ABOUTME: Stores user-defined and built-in callables for runtime name resolution.
// ABOUTME: Keeps internal callables separate from user-visible environment values.

import type { FuncStmt } from "./ast.ts";
import type { DrawingCall } from "./draw/drawing-types.ts";
import { drawingCalls } from "./draw/drawing-caller.ts";

export type Callable =
	| { kind: "user"; declaration: FuncStmt }
	| { kind: "drawing"; invoke: DrawingCall }
	| {
			kind: "print";
	  };

export class CallableRegistry {
	private callables: Map<string, Callable> = new Map();

	constructor() {
		// register drawing calls
		for (const [name, invoke] of Object.entries(drawingCalls)) {
			this.register(name, { kind: "drawing", invoke });
		}
		// register print call
		this.register("print", { kind: "print" });
	}

	register(name: string, callable: Callable) {
		this.callables.set(name, callable);
	}

	get(name: string): Callable | undefined {
		return this.callables.get(name);
	}
}
