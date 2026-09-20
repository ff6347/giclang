// ABOUTME: Verifies reusable functions and deterministic calls in Firefox.
// ABOUTME: Covers the motif example, seeded reruns, and recursion cancellation.

import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { setEditorSource } from "./editor.ts";

async function canvasData(page: Page) {
	return page.locator("#canvas").evaluate((element) => {
		if (!(element instanceof HTMLCanvasElement)) {
			throw new Error("Expected #canvas to be a canvas element.");
		}
		return element.toDataURL();
	});
}

async function sampleMotif(page: Page) {
	return page.locator("#canvas").evaluate((element) => {
		if (!(element instanceof HTMLCanvasElement)) {
			throw new Error("Expected #canvas to be a canvas element.");
		}
		const context = element.getContext("2d");
		if (context === null) {
			throw new Error("Expected a 2D canvas context.");
		}
		const background = context.getImageData(0, 0, 1, 1).data;
		const differsFromBackground = (x: number, y: number) => {
			const pixel = context.getImageData(x, y, 1, 1).data;
			return [0, 1, 2].some((index) => pixel[index] !== background[index]);
		};
		return {
			backgroundOpaque: background[3] === 255,
			firstCircleVisible: differsFromBackground(20, 20),
			firstLineVisible: differsFromBackground(25, 25),
			secondCircleVisible: differsFromBackground(60, 60),
			secondLineVisible: differsFromBackground(65, 65),
			spaceBetweenMotifsClear: !differsFromBackground(45, 45),
		};
	});
}

async function centerAlpha(page: Page) {
	return page.locator("#canvas").evaluate((element) => {
		if (!(element instanceof HTMLCanvasElement)) {
			throw new Error("Expected #canvas to be a canvas element.");
		}
		const context = element.getContext("2d");
		if (context === null) {
			throw new Error("Expected a 2D canvas context.");
		}
		return context.getImageData(50, 50, 1, 1).data[3];
	});
}

test("renders the reusable motif example through function calls", async ({
	page,
}) => {
	const source = await readFile(
		new URL(
			"../content/examples/reusable-motif/reusable-motif.gic",
			import.meta.url,
		),
		"utf8",
	);
	await page.goto("/");
	await setEditorSource(page, source);

	await expect
		.poll(() => sampleMotif(page))
		.toEqual({
			backgroundOpaque: true,
			firstCircleVisible: true,
			firstLineVisible: true,
			secondCircleVisible: true,
			secondLineVisible: true,
			spaceBetweenMotifsClear: true,
		});
});

test("renders identical Canvas data after independent seeded runs", async ({
	page,
}) => {
	const source = `randomSeed(42);
background("#ffffff");
fill("#000000");
noStroke();
repeat(i, 0, 8) {
	circle(random(10, 90), random(10, 90), 4);
}`;
	await page.goto("/");
	const emptyCanvas = await canvasData(page);

	await setEditorSource(page, source);
	await expect.poll(() => canvasData(page)).not.toBe(emptyCanvas);
	const firstRun = await canvasData(page);

	await setEditorSource(page, "circle(1);");
	await expect(page.locator("#problems")).toContainText(
		"Function 'circle' expects 3 arguments, but got 1.",
	);
	await expect.poll(() => canvasData(page)).toBe(emptyCanvas);

	await setEditorSource(page, source);
	await expect.poll(() => canvasData(page)).toBe(firstRun);
	await expect(page.locator("#problems")).toHaveText("");
});

test("terminates runaway recursion and clears stale Canvas output", async ({
	page,
}) => {
	const validSource = `background("#ffffff");
fill("#000000");
noStroke();
circle(50, 50, 20);`;
	const runawaySource = `func forever() {
	repeat(i, 0, 100000) {}
	return forever();
}
forever();`;
	await page.goto("/");

	await setEditorSource(page, validSource);
	await expect.poll(() => centerAlpha(page)).toBe(255);

	await setEditorSource(page, runawaySource);
	await expect(page.locator("#problems")).toHaveText(
		"The preview took too long and was terminated after 500ms.",
	);
	await expect.poll(() => centerAlpha(page)).toBe(0);
});
