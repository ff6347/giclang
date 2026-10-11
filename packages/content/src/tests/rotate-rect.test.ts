// ABOUTME: Verifies the rectangle example calculates rotated vertices at runtime.
// ABOUTME: Covers its composition and reusable rotation for varied rectangles.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import type { Command, RunResult } from "../../../core/dist/core.js";

const runtimeCorePath = ["../../../core/src/core", "ts"].join(".");
const runSource: (source: string) => RunResult = (await import(runtimeCorePath))
	.runSource;
const source = await readFile(
	new URL(
		"../../content/examples/rotate-rect/rotate-rect.gic",
		import.meta.url,
	),
	"utf8",
);

function assertRectangle(
	command: Command | undefined,
	x: number,
	y: number,
	width: number,
	height: number,
	angle: number,
) {
	assert.ok(command?.type === "quad");
	const actual: [number, number][] = [
		[command.x1, command.y1],
		[command.x2, command.y2],
		[command.x3, command.y3],
		[command.x4, command.y4],
	];
	const corners: [number, number][] = [
		[x - width / 2, y - height / 2],
		[x + width / 2, y - height / 2],
		[x + width / 2, y + height / 2],
		[x - width / 2, y + height / 2],
	];
	const radians = (angle * Math.PI) / 180;
	for (const [index, [localX, localY]] of corners.entries()) {
		const expectedX =
			50 + Math.cos(radians) * localX - Math.sin(radians) * localY;
		const expectedY =
			50 + Math.sin(radians) * localX + Math.cos(radians) * localY;
		assert.ok(Math.abs(actual[index]![0] - expectedX) < 1e-9);
		assert.ok(Math.abs(actual[index]![1] - expectedY) < 1e-9);
	}
}

describe("rectangle rotation example", () => {
	it("preserves the original 13-degree composition and style", () => {
		const result = runSource(source);
		assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
		if (!result.ok) return;
		assert.equal(result.commands.length, 4);
		assert.deepEqual(result.commands.slice(0, 3), [
			{ type: "background", color: { kind: "css", value: "#000000" } },
			{ type: "noStroke" },
			{ type: "fill", color: { kind: "css", value: "#ffffff" } },
		]);
		assertRectangle(result.commands[3], -100 / 3, 0, 100, 100, 13);
	});

	for (const angle of [0, 45, 90, -30]) {
		it(`rotates the rectangle at ${angle} degrees through its function`, () => {
			const result = runSource(
				`${source}\nrotate(-WIDTH / 3, 0, WIDTH, HEIGHT, ${angle});`,
			);
			assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
			if (!result.ok) return;
			assert.equal(result.commands.length, 5);
			assertRectangle(result.commands.at(-1), -100 / 3, 0, 100, 100, angle);
		});
	}

	it("rotates a rectangle with a different position and dimensions", () => {
		const result = runSource(`${source}\nrotate(-10, 20, 30, 10, 25);`);
		assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
		if (!result.ok) return;
		assertRectangle(result.commands.at(-1), -10, 20, 30, 10, 25);
	});
});
