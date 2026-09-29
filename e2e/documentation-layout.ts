// ABOUTME: Docks the authoring and documentation workspaces through the UI.
// ABOUTME: Shares the two-step panel-drag setup across browser and PWA tests.

import { expect, type Page } from "@playwright/test";

export async function showBothWorkspaces(page: Page) {
	await page.getByRole("tab", { name: "Settings" }).click();
	const workspace = page.locator(".application-layout");
	const bounds = await workspace.boundingBox();
	expect(bounds).not.toBeNull();
	const tab = await page.getByRole("tab", { name: "Gestalten" }).boundingBox();
	expect(tab).not.toBeNull();
	await page.mouse.move(tab!.x + tab!.width / 2, tab!.y + tab!.height / 2);
	await page.mouse.down();
	await page.mouse.move(bounds!.x + 8, bounds!.y + bounds!.height / 2, {
		steps: 16,
	});
	await page.mouse.up();
	await expect(page.getByRole("tabpanel", { name: "Gestalten" })).toBeVisible();
	await page.getByRole("tab", { name: "Docs" }).click();
	const docs = page.getByRole("tabpanel", { name: "Docs" });
	await expect(docs).toBeVisible();
	return docs;
}

export async function moveDocumentationBesideEditor(page: Page, title: string) {
	const source = await page.getByRole("tab", { name: title }).boundingBox();
	const target = await page
		.getByRole("tab", { name: /^sketch_\d{8}[a-z]+$/ })
		.boundingBox();
	expect(source).not.toBeNull();
	expect(target).not.toBeNull();
	await page.mouse.move(
		source!.x + source!.width / 2,
		source!.y + source!.height / 2,
	);
	await page.mouse.down();
	await page.mouse.move(
		target!.x + target!.width / 2,
		target!.y + target!.height / 2,
		{ steps: 16 },
	);
	await page.mouse.up();
}
