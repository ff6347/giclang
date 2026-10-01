// ABOUTME: Verifies CSS-color swatches in the real Monaco editor.
// ABOUTME: Confirms accepted color edits update their visible swatch.

import { expect, test } from "@playwright/test";
import { setEditorSource } from "./editor.ts";

test("shows and updates swatches only for named color arguments", async ({
	page,
}) => {
	await page.goto("/");
	await setEditorSource(page, 'background("tomato"); print("blue");');

	const swatches = page.locator(".colorpicker-color-decoration");
	await expect(swatches).toHaveCount(1);
	await expect
		.poll(() =>
			swatches
				.first()
				.evaluate((element) => getComputedStyle(element).backgroundColor),
		)
		.toBe("rgb(255, 99, 71)");

	await setEditorSource(page, 'background("royalblue"); print("tomato");');
	await expect(swatches).toHaveCount(1);
	await expect
		.poll(() =>
			swatches
				.first()
				.evaluate((element) => getComputedStyle(element).backgroundColor),
		)
		.toBe("rgb(65, 105, 225)");

	await setEditorSource(page, 'background("notacolor"); print("blue");');
	await expect(swatches).toHaveCount(0);
});

test("shows hex swatches next to named colors and updates them after edits", async ({
	page,
}) => {
	await page.goto("/");
	await setEditorSource(page, 'background("#ff6347"); fill("blue");');

	const swatches = page.locator(".colorpicker-color-decoration");
	await expect(swatches).toHaveCount(2);
	await expect
		.poll(() =>
			swatches
				.first()
				.evaluate((element) => getComputedStyle(element).backgroundColor),
		)
		.toBe("rgb(255, 99, 71)");

	await setEditorSource(page, 'background("#00ff00"); fill("blue");');
	await expect(swatches).toHaveCount(2);
	await expect
		.poll(() =>
			swatches
				.first()
				.evaluate((element) => getComputedStyle(element).backgroundColor),
		)
		.toBe("rgb(0, 255, 0)");
});
