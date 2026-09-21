// ABOUTME: Verifies bundled Markdown and example visibility through the workspace UI.
// ABOUTME: Covers About, Docs, and disabled example exclusion.

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
	await expect(docs.getByRole("heading", { level: 2 })).toHaveText([
		"Language reference",
		"Conditions",
		"Drawing",
		"Repeat",
	]);
	await expect(
		page.getByText("Language reference and help for writing GIC programs."),
	).toBeVisible();
	await expect(page).toHaveURL("/");
});

test("hides disabled examples from the application", async ({ page }) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Examples" }).click();

	const examples = page.getByRole("tabpanel", { name: "Examples" });
	await expect(
		examples.getByRole("heading", { name: "Examples" }),
	).toBeVisible();
	await expect(examples.getByRole("listitem")).toHaveCount(0);
	await expect(
		examples.getByRole("button", { name: "Load this example" }),
	).toHaveCount(0);
});
