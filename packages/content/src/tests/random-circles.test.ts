// ABOUTME: Verifies Random Circles uses the random state supplied by its run.
// ABOUTME: Checks the circle grid retains its geometry and radius bounds.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { it } from "node:test";
import type { RunResult } from "../../../core/dist/core.js";

const runtimeCorePath = ["../../../core/src/core", "ts"].join(".");
const runSource: (source: string) => RunResult = (await import(runtimeCorePath))
	.runSource;
const source = await readFile(
	new URL(
		"../../content/examples/random-circles/random-circles.gic",
		import.meta.url,
	),
	"utf8",
);

for (const seed of [0, 2000]) {
	it(`Random Circles respects the run's random state for seed ${seed}`, () => {
		const expected = runSource(
			`randomSeed(${seed}); circle(1, 1, random(0, 2.5));`,
		);
		const result = runSource(`randomSeed(${seed});\n${source}`);
		assert.equal(expected.ok, true);
		assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
		if (!expected.ok || !result.ok) return;
		const circles = result.commands.filter(
			(command) => command.type === "circle",
		);
		assert.equal(circles.length, 400);
		assert.deepEqual(circles[0], expected.commands.at(-1));
		for (const [index, circle] of circles.entries()) {
			assert.equal(circle.x, 1 + (index % 20) * 5);
			assert.equal(circle.y, 1 + Math.floor(index / 20) * 5);
			assert.ok(circle.radius >= 0 && circle.radius < 2.5);
		}
	});
}
