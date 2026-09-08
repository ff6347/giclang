// ABOUTME: Creates commands that disable strokes for subsequent shapes.
// ABOUTME: Keeps stroke-style command construction outside the interpreter.

import type { Command } from "../commands.ts";

export function noStroke(): Command {
	return {
		type: "noStroke",
	};
}
