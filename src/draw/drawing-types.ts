// ABOUTME: Defines shared input and function types for drawing command construction.
// ABOUTME: Keeps drawing constructors independent from their dispatch registry.

import type { Command } from "../commands.ts";
import type { Token } from "../tokens.ts";

export type DrawingInput = {
	values: readonly unknown[];
	token: Token;
};

export type DrawingCall = (input: DrawingInput) => Command;
