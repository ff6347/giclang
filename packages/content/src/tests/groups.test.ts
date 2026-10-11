// ABOUTME: Verifies the Groups sketch uses the random state supplied by its run.
// ABOUTME: Checks different random choices produce the corresponding grid scales.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { it } from "node:test";
import type { RunResult } from "../../../core/dist/core.js";

const runtimeCorePath = ["../../../core/src/core", "ts"].join(".");
const runSource: (source: string) => RunResult = (await import(runtimeCorePath))
	.runSource;
const source = await readFile(
	new URL("../../content/examples/groups/groups.gic", import.meta.url),
	"utf8",
);

for (const [seed, step] of [
	[0, 2],
	[2000, 1],
] as const) {
	it(`Groups respects the run's random state and draws a ${step}-pixel grid`, () => {
		const result = runSource(`randomSeed(${seed});\n${source}`);
		assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
		if (!result.ok) return;
		const rectangles = result.commands.filter(
			(command) => command.type === "rect",
		);
		assert.equal(rectangles.length, (100 / step - 1) ** 2);
		assert.deepEqual(rectangles[0], {
			type: "rect",
			x: step * 0.75,
			y: step * 0.75,
			width: step / 2,
			height: step / 2,
		});
	});
}
