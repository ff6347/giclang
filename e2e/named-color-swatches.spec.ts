// ABOUTME: Verifies CSS-color swatches in the real Monaco editor.
// ABOUTME: Confirms accepted color edits update their visible swatch.

import { expect, test } from "@playwright/test";
import { setEditorSource } from "./editor.ts";

test("shows and updates swatches for names in drawing calls and ordinary strings", async ({
	page,
}) => {
	await page.goto("/");
	await setEditorSource(page, 'background("tomato"); print("blue");');

	const swatches = page.locator(".colorpicker-color-decoration");
	await expect(swatches).toHaveCount(2);
	await expect
		.poll(() =>
			swatches
				.first()
				.evaluate((element) => getComputedStyle(element).backgroundColor),
		)
		.toBe("rgb(255, 99, 71)");

	await setEditorSource(page, 'background("royalblue"); print("tomato");');
	await expect(swatches).toHaveCount(2);
	await expect
		.poll(() =>
			swatches
				.first()
				.evaluate((element) => getComputedStyle(element).backgroundColor),
		)
		.toBe("rgb(65, 105, 225)");

	await setEditorSource(page, 'background("notacolor"); print("blue");');
	await expect(swatches).toHaveCount(1);
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

test("shows separate swatches for colors embedded in prose strings", async ({
	page,
}) => {
	await page.goto("/");
	await setEditorSource(
		page,
		[
			'background("pink");',
			'let col = "pink";',
			'let hex = "#ff6347";',
			'let nameString = "this is lightgoldenrodyellow color";',
			'let hexInString = "this is tomato #ff6347 would be nice";',
		].join("\n"),
	);

	const swatches = page.locator(".colorpicker-color-decoration");
	await expect(swatches).toHaveCount(6);
	await expect
		.poll(() =>
			swatches.evaluateAll((elements) =>
				elements.map((element) => getComputedStyle(element).backgroundColor),
			),
		)
		.toEqual([
			"rgb(255, 192, 203)",
			"rgb(255, 192, 203)",
			"rgb(255, 99, 71)",
			"rgb(250, 250, 210)",
			"rgb(255, 99, 71)",
			"rgb(255, 99, 71)",
		]);
});
