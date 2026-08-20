// ABOUTME: Tests that ordinary analyzer blocks retain their enclosing semantic scope.
// ABOUTME: Covers flat if and animation-loop declarations and global reservations.
import test, { describe } from "node:test";

describe("Analyser blocks", () => {
	test.todo("should keep a top-level if declaration visible after the block");
	test.todo(
		"should keep a function-local if declaration visible after the block",
	);
	test.todo(
		"should reserve a global name declared in a top-level block throughout the program",
	);
	test.todo(
		"should reserve a global name declared in the animation loop throughout the program",
	);
});
