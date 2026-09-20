// ABOUTME: Verifies bundled Markdown and example content through the workspace UI.
// ABOUTME: Covers About, Docs, example descriptions, thumbnails, and editable copies.

import { expect, test } from "@playwright/test";

test("presents bundled About and documentation content without navigation", async ({
	page,
}) => {
	await page.goto("/");

	await page.getByRole("tab", { name: "About" }).click();
	await expect(
		page.getByText(
			"Gestalten in Code is a small C-style language for creating two-dimensional generative graphics",
		),
	).toBeVisible();
	await expect(page.getByRole("link", { name: "React" })).toBeVisible();
	await expect(page).toHaveURL("/");

	await page.getByRole("tab", { name: "Docs" }).click();
	const docs = page.getByRole("tabpanel", { name: "Docs" });
	await expect(docs.getByRole("button")).toHaveCount(0);
	await expect(
		docs.getByRole("heading", { level: 2, name: "Language reference" }),
	).toHaveCount(1);
	await expect(
		page.getByText("Language reference and help for writing GIC programs."),
	).toBeVisible();
	await expect(page).toHaveURL("/");
});

test("shows static example content and opens its source as an unsaved copy", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Examples" }).click();

	await expect(
		page.getByRole("heading", { name: "Repeated grid" }),
	).toBeVisible();
	await expect(
		page.getByRole("img", { name: "Repeated grid thumbnail" }),
	).toBeVisible();
	await expect(page.getByText("nested repeat statements")).toBeVisible();

	const repeatedGrid = page
		.getByRole("listitem")
		.filter({ hasText: "Repeated grid" });
	await repeatedGrid.getByRole("button", { name: "Load this example" }).click();
	await expect(page.getByRole("tab", { name: "Gestalten" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	await expect(
		page.getByRole("tab", { name: "repeat.gic", exact: true }),
	).toBeVisible();
});

test("wraps example cards at a compact width", async ({ page }) => {
	await page.setViewportSize({ height: 800, width: 1100 });
	await page.goto("/");
	await page.getByRole("tab", { name: "Examples" }).click();

	const cards = page.getByRole("listitem");
	const first = await cards.nth(0).boundingBox();
	const second = await cards.nth(1).boundingBox();
	expect(first).not.toBeNull();
	expect(second).not.toBeNull();
	expect(first!.width).toBeLessThanOrEqual(288);
	expect(second!.y).toBeCloseTo(first!.y, 0);

	await page.setViewportSize({ height: 800, width: 360 });
	await expect(cards.nth(0)).toBeVisible();
	const narrow = await cards.nth(0).boundingBox();
	expect(narrow).not.toBeNull();
	expect(narrow!.width).toBeLessThan(360);
});
