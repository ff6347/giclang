// ABOUTME: Verifies reusable user functions through the complete source pipeline.
// ABOUTME: Pins declaration registration, parameter binding, and call command order.

import assert from "node:assert";
import test, { describe } from "node:test";
import { runSource } from "../core.ts";

describe("interpreter user functions", () => {
	test("should draw a two-command motif at two call positions", () => {
		const source = `func motif(x, y) {
	line(x, y, x + 10, y + 10);
	circle(x, y, 3);
	return;
}

motif(10, 20);
motif(30, 40);`;

		const actual = runSource(source);

		assert.deepStrictEqual(actual, {
			ok: true,
			commands: [
				{ type: "line", x1: 10, y1: 20, x2: 20, y2: 30 },
				{ type: "circle", x: 10, y: 20, radius: 3 },
				{ type: "line", x1: 30, y1: 40, x2: 40, y2: 50 },
				{ type: "circle", x: 30, y: 40, radius: 3 },
			],
			diagnostics: [],
			output: [],
		});
	});

	test("should use a function return value as a circle radius", () => {
		const source = `func radius(value) {
	return value * 2;
}

circle(10, 20, radius(3));`;

		const actual = runSource(source);

		assert.deepStrictEqual(actual, {
			ok: true,
			commands: [{ type: "circle", x: 10, y: 20, radius: 6 }],
			diagnostics: [],
			output: [],
		});
	});

	test("should isolate local bindings across recursive calls", () => {
		const source = `func sum(value) {
	if (value <= 0) {
		return 0;
	}
	let current = value;
	let remainder = sum(value - 1);
	return current + remainder;
}

circle(10, 20, sum(3));`;

		const actual = runSource(source);

		assert.deepStrictEqual(actual, {
			ok: true,
			commands: [{ type: "circle", x: 10, y: 20, radius: 6 }],
			diagnostics: [],
			output: [],
		});
	});

	test("should return from a repeat body and function", () => {
		const source = `func radius() {
	repeat(i, 0, 3) {
		return 1;
	}
	return 99;
}

circle(10, 20, radius());`;

		const actual = runSource(source);

		assert.deepStrictEqual(actual, {
			ok: true,
			commands: [{ type: "circle", x: 10, y: 20, radius: 1 }],
			diagnostics: [],
			output: [],
		});
	});

	test("should stop a function body after return", () => {
		const source = `func draw() {
	line(1, 2, 3, 4);
	return;
	circle(5, 6, 7);
}

draw();`;

		const actual = runSource(source);

		assert.deepStrictEqual(actual, {
			ok: true,
			commands: [{ type: "line", x1: 1, y1: 2, x2: 3, y2: 4 }],
			diagnostics: [],
			output: [],
		});
	});

	test("should exit a function from a taken if", () => {
		const source = `func draw() {
	line(1, 2, 3, 4);
	if (true) {
		return;
	}
	circle(5, 6, 7);
}

draw();`;

		const actual = runSource(source);

		assert.deepStrictEqual(actual, {
			ok: true,
			commands: [{ type: "line", x1: 1, y1: 2, x2: 3, y2: 4 }],
			diagnostics: [],
			output: [],
		});
	});

	test("should read a previously declared global in a drawing function", () => {
		const source = `let size = 7;

func draw() {
	line(0, 0, size, size);
	return;
}

draw();`;

		const actual = runSource(source);

		assert.deepStrictEqual(actual, {
			ok: true,
			commands: [{ type: "line", x1: 0, y1: 0, x2: 7, y2: 7 }],
			diagnostics: [],
			output: [],
		});
	});

	test("should observe a global assignment after a function call", () => {
		const source = `let position = 1;

func update() {
	position = 9;
	return;
}

update();
line(0, 0, position, 0);`;

		const actual = runSource(source);

		assert.deepStrictEqual(actual, {
			ok: true,
			commands: [{ type: "line", x1: 0, y1: 0, x2: 9, y2: 0 }],
			diagnostics: [],
			output: [],
		});
	});

	test("should evaluate mutating arguments once from left to right", () => {
		const source = `let trace = 0;

func first() {
	trace = trace + 1;
	return 1;
}

func second() {
	trace = trace * 10 + 2;
	return 2;
}

func draw(firstValue, secondValue) {
	line(0, 0, trace, firstValue + secondValue);
	return;
}

draw(first(), second());`;

		const actual = runSource(source);

		assert.deepStrictEqual(actual, {
			ok: true,
			commands: [{ type: "line", x1: 0, y1: 0, x2: 12, y2: 3 }],
			diagnostics: [],
			output: [],
		});
	});
});
