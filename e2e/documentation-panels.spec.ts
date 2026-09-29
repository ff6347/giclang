// ABOUTME: Verifies bundled documentation pages behave as movable workspace tabs.
// ABOUTME: Follows relative links to the same panel regardless of its location.

import { expect, test } from "@playwright/test";
import {
	moveDocumentationBesideEditor,
	showBothWorkspaces,
} from "./documentation-layout.ts";

test("selects an existing documentation panel from a relative link", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Docs" }).click();
	const docs = page.getByRole("tabpanel", { name: "Docs" });
	await docs.getByRole("tab", { name: "Colors", exact: true }).click();
	await docs.getByRole("link", { name: "distinct tab" }).click();
	await expect(docs.getByRole("tab", { name: "Named Colors" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	await expect(
		docs.getByRole("heading", { name: "Named Colors", level: 2 }),
	).toBeVisible();
	await expect(page).toHaveURL("/");
});

test("moves one page beside the editor, persists it, and restores the default", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1600, height: 900 });
	await page.goto("/");
	const docs = await showBothWorkspaces(page);
	const named = page.getByRole("tab", { name: "Named Colors" });
	await moveDocumentationBesideEditor(page, "Named Colors");

	await expect(docs.getByRole("tab", { name: "Named Colors" })).toHaveCount(0);
	await expect(
		page.getByRole("article", { name: "Named Colors" }),
	).toBeVisible();
	await page.reload();
	await expect(page.getByRole("tabpanel", { name: "Gestalten" })).toBeVisible();
	await expect(docs.getByRole("tab", { name: "Named Colors" })).toHaveCount(0);
	await expect(named).toBeVisible();

	await page
		.getByRole("tab", { name: "Gestalten" })
		.dragTo(page.getByRole("tab", { name: "Docs" }));
	await page.getByRole("tab", { name: "Docs" }).click();
	await expect(page.getByRole("tabpanel", { name: "Gestalten" })).toBeHidden();
	await docs.getByRole("tab", { name: "Colors", exact: true }).click();
	await docs.getByRole("link", { name: "distinct tab" }).click();
	await expect(named).toHaveAttribute("aria-selected", "true");
	await expect(page.getByRole("tab", { name: "Gestalten" })).toHaveAttribute(
		"aria-selected",
		"true",
	);

	const visibleDocs = await showBothWorkspaces(page);
	await named.dragTo(visibleDocs.getByRole("tab", { name: "Drawing" }));
	await expect(
		visibleDocs.getByRole("tab", { name: "Named Colors" }),
	).toBeVisible();
	await page.getByRole("tab", { name: "Settings" }).click();
	await page.getByRole("button", { name: "Reset Layout" }).click();
	await page.getByRole("tab", { name: "Docs" }).click();
	await expect(
		page.getByRole("tabpanel", { name: "Docs" }).getByRole("tab"),
	).toHaveText([
		"Language reference",
		"Conditionals",
		"Colors",
		"Drawing",
		"Named Colors",
		"Repeat a.k.a. Loops",
		"User defined Functions",
		"Math",
	]);
});
