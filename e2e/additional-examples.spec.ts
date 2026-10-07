// ABOUTME: Verifies the additional static sketches through the example gallery.
// ABOUTME: Checks thumbnail loading, worker previews, and matching PNG exports.

import { expect, test } from "@playwright/test";
import { canvasPixels, downloadPng, readPng } from "./png.ts";

const examples = [
	["print-goto-10", "10 PRINT"],
	["dancing-triangles", "Dancing Triangles"],
	["dashed-line", "Dashed Line"],
	["polar-grid-rectangles", "Polar Grid Rectangles"],
	["nested-loops-bubbles", "Nested-loop Bubbles"],
	["checker-weave", "Checker Weave"],
	["adventskranz", "Adventskranz"],
	["perspective-through-contrast", "Perspective Through Contrast"],
	["cosine-graph", "Cosine Graph"],
	["house", "House"],
	["perspective-through-shadow", "Perspective Through Shadow"],
	["rotate-rect", "Rotate Rect"],
] as const;

for (const [id, title] of examples) {
	test(`${title} loads from the gallery and renders an exportable sketch`, async ({
		page,
	}, testInfo) => {
		await page.goto("/");
		await page.getByRole("tab", { name: "Examples", exact: true }).click();
		const card = page.getByRole("listitem").filter({
			has: page.getByRole("heading", { name: title, exact: true }),
		});
		const thumbnail = card.getByRole("img", { name: `${title} thumbnail` });
		await expect(thumbnail).toBeVisible();
		await expect
			.poll(() =>
				thumbnail.evaluate((image: HTMLImageElement) => image.naturalWidth),
			)
			.toBe(100);
		await expect(card.getByRole("link").first()).toHaveAttribute(
			"href",
			title === "Rotate Rect"
				? /^https:\/\/github\.com\/ff6347\/gestalten-in-code\//
				: /^https:\/\/snippets\.qawsed\.site\//,
		);
		await card.getByRole("button", { name: "Load this example" }).click();
		await expect(
			page.getByRole("tab", { name: `${id}.gic`, exact: true }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Download PNG" }),
		).toBeEnabled();
		await expect(page.locator("#problems")).toHaveText("");
		const pixels = await canvasPixels(page);
		const colors = new Set<string>();
		for (let offset = 0; offset < pixels.length; offset += 4) {
			colors.add(Array.from(pixels.slice(offset, offset + 4)).join(","));
		}
		expect(colors.size).toBeGreaterThan(1);
		const exported = readPng(await downloadPng(page));
		expect(exported.width).toBe(100);
		expect(exported.height).toBe(100);
		expect(Array.from(exported.pixels)).toEqual(Array.from(pixels));
		await testInfo.attach("preview", {
			body: await page.locator("#canvas").screenshot(),
			contentType: "image/png",
		});
	});
}
