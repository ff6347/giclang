// ABOUTME: Verifies every GIC shape through the real Firefox Canvas preview.
// ABOUTME: Pins shape geometry, style behavior, point pixels, and open arcs.

import { expect, test, type Page } from "@playwright/test";

type SamplePoint = {
	name: string;
	x: number;
	y: number;
};

async function sampleVisibility(page: Page, points: SamplePoint[]) {
	return page.locator("#canvas").evaluate((element, points) => {
		if (!(element instanceof HTMLCanvasElement)) {
			throw new Error("Expected #canvas to be a canvas element.");
		}
		const context = element.getContext("2d");
		if (context === null) {
			throw new Error("Expected a 2D canvas context.");
		}
		const background = context.getImageData(0, 0, 1, 1).data;
		const visible = Object.fromEntries(
			points.map(({ name, x, y }) => {
				const pixel = context.getImageData(x, y, 1, 1).data;
				return [
					name,
					[0, 1, 2].some((index) => pixel[index] !== background[index]),
				];
			}),
		);
		return {
			backgroundOpaque: background[3] === 255,
			visible,
		};
	}, points);
}

test("renders a round point centred on its coordinate", async ({ page }) => {
	const source = `background("#ffffff");
fill("tomato");
stroke("#000000");
strokeWidth(8);
point(20, 20);`;
	await page.goto("/");
	await page.getByLabel("GiC").fill(source);

	await expect
		.poll(() =>
			sampleVisibility(page, [
				{ name: "center", x: 20, y: 20 },
				{ name: "insideTop", x: 20, y: 17 },
				{ name: "insideRight", x: 23, y: 20 },
				{ name: "outsideCorner", x: 16, y: 16 },
				{ name: "outsideRadius", x: 20, y: 15 },
			]),
		)
		.toEqual({
			backgroundOpaque: true,
			visible: {
				center: true,
				insideTop: true,
				insideRight: true,
				outsideCorner: false,
				outsideRadius: false,
			},
		});
});

test("renders a line between two coordinates", async ({ page }) => {
	const source = `background("#ffffff");
fill("tomato");
stroke("#000000");
strokeWidth(3);
line(10, 20, 40, 20);`;
	await page.goto("/");
	await page.getByLabel("GiC").fill(source);

	await expect
		.poll(() =>
			sampleVisibility(page, [
				{ name: "lineMiddle", x: 25, y: 20 },
				{ name: "beforeLine", x: 5, y: 20 },
				{ name: "aboveLine", x: 25, y: 16 },
				{ name: "belowLine", x: 25, y: 24 },
			]),
		)
		.toEqual({
			backgroundOpaque: true,
			visible: {
				lineMiddle: true,
				beforeLine: false,
				aboveLine: false,
				belowLine: false,
			},
		});
});

test("renders a rectangle from its top-left coordinate", async ({ page }) => {
	const source = `background("#ffffff");
fill("#000000");
noStroke();
rect(10, 10, 20, 15);`;
	await page.goto("/");
	await page.getByLabel("GiC").fill(source);

	await expect
		.poll(() =>
			sampleVisibility(page, [
				{ name: "topLeft", x: 10, y: 10 },
				{ name: "insideBottomRight", x: 29, y: 24 },
				{ name: "beforeRectangle", x: 9, y: 10 },
				{ name: "afterRectangle", x: 31, y: 25 },
			]),
		)
		.toEqual({
			backgroundOpaque: true,
			visible: {
				topLeft: true,
				insideBottomRight: true,
				beforeRectangle: false,
				afterRectangle: false,
			},
		});
});

test("renders an ellipse centred on its coordinate", async ({ page }) => {
	const source = `background("#ffffff");
fill("#000000");
noStroke();
ellipse(50, 50, 30, 10);`;
	await page.goto("/");
	await page.getByLabel("GiC").fill(source);

	await expect
		.poll(() =>
			sampleVisibility(page, [
				{ name: "center", x: 50, y: 50 },
				{ name: "insideHorizontalRadius", x: 63, y: 50 },
				{ name: "insideVerticalRadius", x: 50, y: 53 },
				{ name: "outsideHorizontalRadius", x: 66, y: 50 },
				{ name: "outsideVerticalRadius", x: 50, y: 56 },
			]),
		)
		.toEqual({
			backgroundOpaque: true,
			visible: {
				center: true,
				insideHorizontalRadius: true,
				insideVerticalRadius: true,
				outsideHorizontalRadius: false,
				outsideVerticalRadius: false,
			},
		});
});

test("renders a filled triangle between its three vertices", async ({
	page,
}) => {
	const source = `background("#ffffff");
fill("#000000");
noStroke();
triangle(10, 80, 30, 20, 50, 80);`;
	await page.goto("/");
	await page.getByLabel("GiC").fill(source);

	await expect
		.poll(() =>
			sampleVisibility(page, [
				{ name: "inside", x: 30, y: 60 },
				{ name: "outsideLeft", x: 10, y: 20 },
				{ name: "outsideRight", x: 50, y: 20 },
				{ name: "above", x: 30, y: 15 },
			]),
		)
		.toEqual({
			backgroundOpaque: true,
			visible: {
				inside: true,
				outsideLeft: false,
				outsideRight: false,
				above: false,
			},
		});
});

test("renders a filled quadrilateral between its four vertices", async ({
	page,
}) => {
	const source = `background("#ffffff");
fill("#000000");
noStroke();
quad(60, 20, 90, 30, 80, 70, 55, 60);`;
	await page.goto("/");
	await page.getByLabel("GiC").fill(source);

	await expect
		.poll(() =>
			sampleVisibility(page, [
				{ name: "inside", x: 72, y: 45 },
				{ name: "outsideTopLeft", x: 55, y: 20 },
				{ name: "outsideTopRight", x: 95, y: 25 },
				{ name: "outsideBottom", x: 75, y: 75 },
			]),
		)
		.toEqual({
			backgroundOpaque: true,
			visible: {
				inside: true,
				outsideTopLeft: false,
				outsideTopRight: false,
				outsideBottom: false,
			},
		});
});

test("renders an open clockwise arc using stroke only", async ({ page }) => {
	const source = `background("#ffffff");
fill("#000000");
stroke("tomato");
strokeWidth(3);
arc(50, 50, 20, 0, 90);`;
	await page.goto("/");
	await page.getByLabel("GiC").fill(source);

	await expect
		.poll(() =>
			sampleVisibility(page, [
				{ name: "clockwiseArc", x: 64, y: 64 },
				{ name: "counterClockwiseSide", x: 64, y: 36 },
				{ name: "unfilledChordRegion", x: 62, y: 62 },
				{ name: "unfilledCenter", x: 50, y: 50 },
			]),
		)
		.toEqual({
			backgroundOpaque: true,
			visible: {
				clockwiseArc: true,
				counterClockwiseSide: false,
				unfilledChordRegion: false,
				unfilledCenter: false,
			},
		});
});
