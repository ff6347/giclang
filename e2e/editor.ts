// ABOUTME: Drives the visible Monaco editor in browser acceptance tests.
// ABOUTME: Replaces source through keyboard input without accessing Monaco internals.

import { expect, type Page } from "@playwright/test";

export async function setEditorSource(page: Page, source: string) {
	const editor = page.locator(".monaco-editor");
	const input = page.getByRole("textbox", { name: "GiC" });
	await expect(editor).toBeVisible();
	await page.locator(".view-lines").click({ position: { x: 5, y: 5 } });
	await expect(input).toBeFocused();
	await page.keyboard.press("Control+A");

	const lines = source.split("\n");
	for (const [index, line] of lines.entries()) {
		await page.keyboard.type(line);
		if (index < lines.length - 1) {
			await page.keyboard.press("Enter");
		}
	}
}
