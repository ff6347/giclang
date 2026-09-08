// ABOUTME: Creates commands that disable fill for subsequent shapes.
// ABOUTME: Keeps fill-style command construction outside the interpreter.

import type { Command } from "../commands.ts";

export function noFill(): Command {
	return {
		type: "noFill",
	};
}
