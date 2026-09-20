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
	await expect(
		page.getByRole("button", { name: "Language reference" }),
	).toBeVisible();
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

	await page.getByRole("button", { name: "repeat.gic" }).click();
	await expect(page.getByRole("tab", { name: "Gestalten" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	await expect(
		page.getByRole("tab", { name: "repeat.gic", exact: true }),
	).toBeVisible();
});
