// ABOUTME: Verifies named-color suggestions in the visible GIC Monaco editor.
// ABOUTME: Checks that selecting a suggestion replaces only the color string.

import { expect, test } from "@playwright/test";
import { setEditorSource } from "./editor.ts";

test("offers and inserts named colors inside a color-string argument", async ({
	page,
}) => {
	await page.goto("/");
	await setEditorSource(page, 'fill("blu");');
	await page.keyboard.press("End");
	for (let index = 0; index < 3; index++) {
		await page.keyboard.press("ArrowLeft");
	}
	await page.keyboard.press("Control+Space");

	const suggestions = page.locator(".suggest-widget");
	await expect(suggestions).toBeVisible();
	await expect(
		suggestions.getByText("blueviolet", { exact: true }).first(),
	).toBeVisible();
	await expect(suggestions.getByText("circle", { exact: true })).toHaveCount(0);
	await suggestions.getByText("blueviolet", { exact: true }).first().click();
	await expect(page.getByRole("textbox", { name: "GiC" })).toHaveValue(
		'fill("blueviolet");',
	);
});

test("suggests named colors while typing inside a string", async ({ page }) => {
	await page.goto("/");
	await setEditorSource(page, 'background("");');
	await page.keyboard.press("End");
	for (let index = 0; index < 3; index++) {
		await page.keyboard.press("ArrowLeft");
	}
	await page.keyboard.type("blu");

	const suggestions = page.locator(".suggest-widget");
	await expect(suggestions).toBeVisible();
	await expect(
		suggestions.getByText("blueviolet", { exact: true }).first(),
	).toBeVisible();
});
