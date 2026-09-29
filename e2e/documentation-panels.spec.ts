// ABOUTME: Verifies bundled documentation pages behave as movable workspace tabs.
// ABOUTME: Follows relative links to the same panel regardless of its location.

import { expect, test } from "@playwright/test";
import {
	followBundledDocumentationLink,
	moveDocumentationBesideEditor,
	showBothWorkspaces,
} from "./documentation-layout.ts";

test("selects an existing documentation panel from a relative link", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Docs" }).click();
	const docs = page.getByRole("tabpanel", { name: "Docs" });
	const tabCount = await docs.getByRole("tab").count();
	const { targetName } = await followBundledDocumentationLink(page);
	await expect(
		docs.getByRole("tab", { name: targetName, exact: true }),
	).toHaveAttribute("aria-selected", "true");
	await expect(docs.getByRole("article", { name: targetName })).toBeVisible();
	await expect(docs.getByRole("tab")).toHaveCount(tabCount);
	await expect(page).toHaveURL("/");
});

test("moves one page beside the editor, persists it, and restores the default", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1600, height: 900 });
	await page.goto("/");
	const docs = await showBothWorkspaces(page);
	const defaultTitles = await docs.getByRole("tab").allTextContents();
	const { sourceName, targetName } = await followBundledDocumentationLink(page);
	const linkedTab = page.getByRole("tab", { name: targetName, exact: true });
	await moveDocumentationBesideEditor(page, targetName);

	await expect(
		docs.getByRole("tab", { name: targetName, exact: true }),
	).toHaveCount(0);
	await expect(page.getByRole("article", { name: targetName })).toBeVisible();
	await page.reload();
	await expect(page.getByRole("tabpanel", { name: "Gestalten" })).toBeVisible();
	await expect(
		docs.getByRole("tab", { name: targetName, exact: true }),
	).toHaveCount(0);
	await expect(linkedTab).toBeVisible();

	await page
		.getByRole("tab", { name: "Gestalten" })
		.dragTo(page.getByRole("tab", { name: "Docs" }));
	await page.getByRole("tab", { name: "Docs" }).click();
	await expect(page.getByRole("tabpanel", { name: "Gestalten" })).toBeHidden();
	await docs.getByRole("tab", { name: sourceName, exact: true }).click();
	await docs
		.getByRole("article", { name: sourceName })
		.locator('a[href$=".md"]')
		.first()
		.click();
	await expect(linkedTab).toHaveAttribute("aria-selected", "true");
	await expect(page.getByRole("tab", { name: "Gestalten" })).toHaveAttribute(
		"aria-selected",
		"true",
	);

	const visibleDocs = await showBothWorkspaces(page);
	await linkedTab.dragTo(visibleDocs.getByRole("tab").first());
	await expect(
		visibleDocs.getByRole("tab", { name: targetName, exact: true }),
	).toBeVisible();
	await page.getByRole("tab", { name: "Settings" }).click();
	await page.getByRole("button", { name: "Reset Layout" }).click();
	await page.getByRole("tab", { name: "Docs" }).click();
	await expect(
		page.getByRole("tabpanel", { name: "Docs" }).getByRole("tab"),
	).toHaveText(defaultTitles);
});
