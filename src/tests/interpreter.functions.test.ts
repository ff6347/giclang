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
		});
	});
});
