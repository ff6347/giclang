// ABOUTME: Drives the visible Monaco editor in browser acceptance tests.
// ABOUTME: Replaces source through keyboard input without accessing Monaco internals.

import { expect, type Page } from "@playwright/test";

export async function setEditorSource(page: Page, source: string) {
	const editor = page.locator(".monaco-editor");
	const input = page.getByRole("textbox", { name: "GiC" });
	await expect(editor).toBeVisible();
	await page.locator(".view-lines").click({ position: { x: 5, y: 5 } });
	await expect(input).toBeFocused();
	const browser = await page.evaluate(() => ({
		isFirefox: navigator.userAgent.includes("Firefox"),
		usesMacShortcut: navigator.platform.startsWith("Mac"),
	}));
	await page.keyboard.press("Control+A");
	if (browser.usesMacShortcut && !browser.isFirefox) {
		await page.keyboard.press("Meta+A");
	}
	await page.keyboard.press("Backspace");
	await expect(page.locator(".view-line")).toHaveText([""]);
	if (!browser.isFirefox) {
		await page.keyboard.insertText(source);
		return;
	}
	const lines = source.split("\n");
	for (const [index, line] of lines.entries()) {
		await page.keyboard.type(line);
		if (index < lines.length - 1) {
			await page.keyboard.press("Enter");
		}
	}
}
