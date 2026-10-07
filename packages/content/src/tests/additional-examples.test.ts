// ABOUTME: Verifies additional example bundles and their drawing behavior.
// ABOUTME: Exercises real GIC results, metadata validation, and seeded output.

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { describe, it } from "node:test";
import type { Color, Command, RunResult } from "../../../core/dist/core.js";
import { validateExampleFiles } from "../content-model.ts";
import { compileMarkdown } from "../markdown-content.ts";

const runtimeCorePath = ["../../../core/src/core", "ts"].join(".");
const runSource: (source: string) => RunResult = (await import(runtimeCorePath))
	.runSource;
const examplesDirectory = new URL("../../content/examples/", import.meta.url);
const counts: Record<string, Partial<Record<Command["type"], number>>> = {
	"print-goto-10": { line: 400 },
	"dancing-triangles": { triangle: 100 },
	"dashed-line": { line: 10 },
	"polar-grid-rectangles": { quad: 81 },
	"nested-loops-bubbles": { circle: 225 },
	"checker-weave": { line: 75 },
	adventskranz: { point: 2520, line: 2520 },
	"perspective-through-contrast": { rect: 3 },
	"cosine-graph": { point: 10, line: 2 },
	house: { circle: 1, rect: 3, quad: 1, triangle: 1, line: 2 },
	"perspective-through-shadow": { rect: 1, triangle: 1 },
};
const neutralGray: Color = { kind: "oklch", lightness: 60, chroma: 0, hue: 0 };
const backgrounds: Record<string, Color> = {
	"print-goto-10": { kind: "css", value: "white" },
	"dancing-triangles": { kind: "oklch", lightness: 12, chroma: 0, hue: 0 },
	"dashed-line": neutralGray,
	"polar-grid-rectangles": neutralGray,
	"nested-loops-bubbles": { kind: "css", value: "black" },
	"checker-weave": { kind: "css", value: "lightgoldenrodyellow" },
	adventskranz: { kind: "css", value: "white" },
	"perspective-through-contrast": neutralGray,
	"cosine-graph": { kind: "css", value: "white" },
	house: { kind: "css", value: "lightgoldenrodyellow" },
	"perspective-through-shadow": {
		kind: "oklch",
		lightness: 90,
		chroma: 0,
		hue: 0,
	},
};
function shapesOfType<Type extends Command["type"]>(
	commands: Command[],
	type: Type,
): Extract<Command, { type: Type }>[] {
	return commands.filter(
		(command): command is Extract<Command, { type: Type }> =>
			command.type === type,
	);
}

function colorsOfType(
	commands: Command[],
	type: "background" | "fill" | "stroke",
): Color[] {
	return commands.flatMap((command) =>
		command.type === type ? [command.color] : [],
	);
}

function inRange(value: number, minimum: number, maximum: number): boolean {
	return value >= minimum && value <= maximum;
}

function closeTo(actual: number, expected: number, tolerance = 1e-8): void {
	assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`);
}

function everyOklch(
	colors: Color[],
	check: (color: Extract<Color, { kind: "oklch" }>) => boolean,
): boolean {
	return colors.every((color) => color.kind === "oklch" && check(color));
}

function hasDefaultStroke(commands: Command[]): boolean {
	return !commands.some(
		(command) => command.type === "noStroke" || command.type === "strokeWidth",
	);
}

function colorIsCss(
	commands: Command[],
	type: "fill" | "stroke",
	value: string,
): boolean {
	return colorsOfType(commands, type).some(
		(color) => color.kind === "css" && color.value === value,
	);
}

describe("additional example bundles", () => {
	for (const [id, expectedCounts] of Object.entries(counts)) {
		it(`${id} validates and draws its characteristic composition`, async () => {
			const directory = new URL(`${id}/`, examplesDirectory);
			validateExampleFiles(id, new Set(await readdir(directory)));
			const description = compileMarkdown(
				`examples/${id}/description.md`,
				await readFile(new URL("description.md", directory), "utf8"),
			);
			assert.ok("enabled" in description && description.enabled);
			const source = await readFile(new URL(`${id}.gic`, directory), "utf8");
			const result = runSource(source);
			assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
			if (!result.ok) return;

			for (const [type, count] of Object.entries(expectedCounts)) {
				assert.equal(
					result.commands.filter((command) => command.type === type).length,
					count,
				);
			}
			assert.deepEqual(
				colorsOfType(result.commands, "background")[0],
				backgrounds[id],
			);
			assert.ok(
				result.commands.every((command) =>
					Object.values(command).every(
						(value) => typeof value !== "number" || Number.isFinite(value),
					),
				),
			);

			if (id === "print-goto-10") {
				const lines = shapesOfType(result.commands, "line");
				assert.ok(colorIsCss(result.commands, "stroke", "black"));
				assert.ok(
					result.commands.some(
						(command) => command.type === "strokeWidth" && command.width === 2,
					),
				);
				for (const line of lines) {
					assert.ok(
						line.x1 >= 0 && line.y1 >= 0 && line.x2 <= 100 && line.y2 <= 100,
					);
					closeTo(
						Math.hypot(line.x2 - line.x1, line.y2 - line.y1),
						Math.sqrt(50),
					);
				}
			} else if (id === "dancing-triangles") {
				const fills = colorsOfType(result.commands, "fill");
				assert.equal(fills.length, 100);
				assert.ok(
					everyOklch(
						fills,
						(color) =>
							color.chroma === 5 &&
							inRange(color.hue, 200, 330) &&
							color.alpha !== undefined &&
							inRange(color.alpha, 0, 100),
					),
				);
				assert.ok(
					!result.commands.some((command) => command.type === "noStroke"),
				);
				for (const triangle of shapesOfType(result.commands, "triangle")) {
					const edges = [
						Math.hypot(triangle.x2 - triangle.x1, triangle.y2 - triangle.y1),
						Math.hypot(triangle.x3 - triangle.x2, triangle.y3 - triangle.y2),
						Math.hypot(triangle.x1 - triangle.x3, triangle.y1 - triangle.y3),
					];
					assert.ok(edges.every((edge) => edge <= 70));
				}
			} else if (id === "dashed-line") {
				assert.ok(hasDefaultStroke(result.commands));
				for (const [index, line] of shapesOfType(
					result.commands,
					"line",
				).entries()) {
					const start = -45 + index * 10;
					const end = start + 5;
					closeTo(line.x1, 50 - start * Math.sin(Math.PI / 4));
					closeTo(line.y1, 50 + start * Math.cos(Math.PI / 4));
					closeTo(line.x2, 50 - end * Math.sin(Math.PI / 4));
					closeTo(line.y2, 50 + end * Math.cos(Math.PI / 4));
				}
			} else if (id === "polar-grid-rectangles") {
				assert.ok(colorIsCss(result.commands, "fill", "white"));
				assert.ok(hasDefaultStroke(result.commands));
				const quads = shapesOfType(result.commands, "quad");
				for (const [index, quad] of quads.entries()) {
					const column = Math.floor(index / 9);
					const row = index % 9;
					closeTo(
						(quad.x1 + quad.x2 + quad.x3 + quad.x4) / 4,
						10 + column * 10,
					);
					closeTo((quad.y1 + quad.y2 + quad.y3 + quad.y4) / 4, 10 + row * 10);
					const edges: [number, number, number, number][] = [
						[quad.x1, quad.y1, quad.x2, quad.y2],
						[quad.x2, quad.y2, quad.x3, quad.y3],
						[quad.x3, quad.y3, quad.x4, quad.y4],
						[quad.x4, quad.y4, quad.x1, quad.y1],
					];
					for (const [x1, y1, x2, y2] of edges)
						closeTo(Math.hypot(x2 - x1, y2 - y1), 5);
				}
				const rotated = quads[9];
				assert.ok(rotated);
				closeTo(
					rotated.x1,
					20 + Math.cos((235 * Math.PI) / 180) * Math.sqrt(2) * 2.5,
				);
				closeTo(
					rotated.y1,
					10 + Math.sin((235 * Math.PI) / 180) * Math.sqrt(2) * 2.5,
				);
			} else if (id === "nested-loops-bubbles") {
				const circles = shapesOfType(result.commands, "circle");
				assert.ok(
					circles.every((circle) => inRange(circle.radius, 3.125, 8.75)),
				);
				assert.equal(circles[0]?.x, 6.25);
				assert.equal(circles.at(-1)?.x, 93.75);
				assert.ok(
					everyOklch(
						colorsOfType(result.commands, "fill"),
						(color) =>
							color.chroma === 12 &&
							inRange(color.hue, 30, 230) &&
							color.alpha !== undefined &&
							inRange(color.alpha, 0, 30),
					),
				);
				assert.ok(
					result.commands.some(
						(command) =>
							command.type === "strokeWidth" && command.width === 0.25,
					),
				);
				assert.ok(
					!result.commands.some((command) => command.type === "noStroke"),
				);
			} else if (id === "checker-weave") {
				const lines = shapesOfType(result.commands, "line");
				assert.ok(colorIsCss(result.commands, "stroke", "black"));
				assert.ok(
					result.commands.some(
						(command) => command.type === "strokeWidth" && command.width === 1,
					),
				);
				assert.deepEqual(
					lines.slice(0, 3).map((line) => [line.x1, line.y1, line.x2, line.y2]),
					[
						[0, 5, 20, 5],
						[0, 10, 20, 10],
						[0, 15, 20, 15],
					],
				);
				assert.deepEqual(
					[lines[3]?.x1, lines[3]?.y1, lines[3]?.x2, lines[3]?.y2],
					[25, 0, 25, 20],
				);
			} else if (id === "adventskranz") {
				const points = shapesOfType(result.commands, "point");
				assert.ok(points.every((point) => inRange(point.x, 22.5, 77.5)));
				assert.ok(result.commands.some((command) => command.type === "noFill"));
				assert.ok(
					result.commands.some(
						(command) =>
							command.type === "strokeWidth" && command.width === 0.5,
					),
				);
				const firstLine = shapesOfType(result.commands, "line")[0];
				assert.ok(firstLine);
				assert.ok(
					Math.abs(
						(firstLine.x1 - 75) * (firstLine.y2 - 50) -
							(firstLine.y1 - 50) * (firstLine.x2 - 75),
					) > 1e-6,
				);
				assert.ok(
					everyOklch(
						colorsOfType(result.commands, "stroke").slice(1),
						(color) =>
							inRange(color.lightness, 40, 100) &&
							color.chroma === 12 &&
							inRange(color.hue, 260, 350),
					),
				);
			} else if (id === "perspective-through-contrast") {
				assert.ok(
					result.commands.some((command) => command.type === "noStroke"),
				);
				assert.ok(
					colorIsCss(result.commands, "fill", "black") &&
						colorIsCss(result.commands, "fill", "white"),
				);
				assert.ok(
					colorsOfType(result.commands, "fill").some(
						(color) => color.kind === "oklch" && color.lightness === 68,
					),
				);
				assert.deepEqual(
					shapesOfType(result.commands, "rect").map(
						({ x, y, width, height }) => `${x},${y},${width},${height}`,
					),
					["0,0,100,74", "15,27,30,66", "55,27,30,66"],
				);
			} else if (id === "cosine-graph") {
				let strokeWidth = 1;
				for (const command of result.commands) {
					if (command.type === "strokeWidth") strokeWidth = command.width;
					if (command.type === "line") assert.equal(strokeWidth, 1);
					if (command.type === "point") assert.equal(strokeWidth, 3);
				}
				assert.deepEqual(
					shapesOfType(result.commands, "line").map(({ x1, y1, x2, y2 }) => [
						x1,
						y1,
						x2,
						y2,
					]),
					[
						[0, 50, 100, 50],
						[50, 0, 50, 100],
					],
				);
				assert.ok(
					shapesOfType(result.commands, "point").every((point) =>
						inRange(point.y, 30, 70),
					),
				);
				assert.ok(
					colorsOfType(result.commands, "stroke").some(
						(color) => color.kind === "oklch" && color.lightness === 80,
					),
				);
				assert.ok(colorIsCss(result.commands, "stroke", "black"));
			} else if (id === "house") {
				assert.ok(colorIsCss(result.commands, "stroke", "orange"));
				const sun = shapesOfType(result.commands, "circle")[0];
				assert.ok(sun);
				assert.equal(sun.y, 50);
				assert.equal(sun.radius, 10);
			} else if (id === "perspective-through-shadow") {
				assert.ok(
					colorIsCss(result.commands, "fill", "white") &&
						colorIsCss(result.commands, "fill", "black"),
				);
				assert.ok(
					result.commands.some((command) => command.type === "noStroke"),
				);
				const rect = shapesOfType(result.commands, "rect")[0];
				const triangle = shapesOfType(result.commands, "triangle")[0];
				assert.ok(rect && triangle);
				assert.deepEqual(
					[
						rect.x,
						rect.y,
						rect.width,
						rect.height,
						triangle.x1,
						triangle.y1,
						triangle.x2,
						triangle.y2,
						triangle.x3,
						triangle.y3,
					],
					[35, 45, 30, 30, 65, 60, 70, 60, 65, 75],
				);
			}
			if (
				[
					"print-goto-10",
					"dancing-triangles",
					"nested-loops-bubbles",
					"adventskranz",
				].includes(id)
			) {
				const repeated = runSource(source);
				assert.equal(repeated.ok, true);
				if (repeated.ok) assert.deepEqual(repeated.commands, result.commands);
			}
		});
	}
});
