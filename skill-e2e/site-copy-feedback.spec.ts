// ABOUTME: Verifies transient website copy confirmation with the real clipboard.
// ABOUTME: Covers fixed button geometry, repeat copying, and reduced motion.

import { expect, test, type Locator } from "@playwright/test";
import { readBundledExample } from "../e2e/example-copy.ts";
import { activateByKeyboard, expectNoHorizontalOverflow } from "./support.ts";

async function dimensions(element: Locator) {
	return element.evaluate((element) => {
		const { width, height } = element.getBoundingClientRect();
		return { width, height };
	});
}

test("clears successful website clipboard feedback automatically", async ({
	context,
	page,
}) => {
	const example = await readBundledExample();
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.goto(`/examples/${example.id}/`);
	const button = page.getByRole("button", {
		name: "Copy to clipboard",
		exact: true,
	});
	await activateByKeyboard(page, button);
	await expect(page.getByRole("status")).toHaveText("Copied to clipboard.");
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
		example.copyText,
	);
	await expect(page.getByRole("status")).toBeEmpty({ timeout: 3_500 });
	await expect(button).toBeEnabled();
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
	test(`shows a transient pixel checkmark without resizing the copy button (${reducedMotion})`, async ({
		context,
		page,
	}) => {
		const example = await readBundledExample();
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.emulateMedia({ reducedMotion });
		await page.goto(`/examples/${example.id}/`);
		await page.evaluate(() => document.fonts.ready);
		const button = page.getByRole("button", {
			name: "Copy to clipboard",
			exact: true,
		});
		const label = button.locator(".copy-label");
		const confirmation = button.locator(".copy-confirmation");
		const article = page.getByRole("article", {
			name: example.title,
			exact: true,
		});
		const size = await dimensions(button);
		const contentSize = await dimensions(article);
		await activateByKeyboard(page, button);
		await expect(confirmation.locator("svg")).toBeVisible();
		await expect(label).toBeHidden();
		await expect(button).toHaveAccessibleName("Copy to clipboard");
		expect(await dimensions(button)).toEqual(size);
		expect(await dimensions(article)).toEqual(contentSize);
		const animations = await confirmation.evaluate(
			(element) => element.getAnimations().length,
		);
		expect(animations).toBe(reducedMotion === "reduce" ? 0 : 1);
		expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
			example.copyText,
		);
		await expect(label).toBeVisible({ timeout: 3_500 });
		await expect(confirmation).toBeHidden();
		await expect(page.getByRole("status")).toBeEmpty();
		expect(await dimensions(button)).toEqual(size);
		await page.setViewportSize({ width: 375, height: 812 });
		const narrowSize = await dimensions(button);
		await button.click();
		await expect(confirmation.locator("svg")).toBeVisible();
		expect(await dimensions(button)).toEqual(narrowSize);
		await expectNoHorizontalOverflow(page);
		await expect(label).toBeVisible({ timeout: 3_500 });
		expect(await dimensions(button)).toEqual(narrowSize);
	});
}

test("restarts copy confirmation when copying again before it disappears", async ({
	context,
	page,
}) => {
	const example = await readBundledExample();
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.goto(`/examples/${example.id}/`);
	const button = page.getByRole("button", {
		name: "Copy to clipboard",
		exact: true,
	});
	const confirmation = button.locator(".copy-confirmation");
	await button.click();
	await expect
		.poll(() =>
			confirmation.evaluate((element) =>
				Number(element.getAnimations()[0]?.currentTime ?? 0),
			),
		)
		.toBeGreaterThan(1_000);
	await button.click();
	await expect(confirmation.locator("svg")).toBeVisible();
	// Cross the first confirmation's deadline while the second is still active.
	await page.waitForTimeout(1_100);
	await expect(button.locator(".copy-label")).toBeHidden();
	await expect(page.getByRole("status")).toHaveText("Copied to clipboard.");
	await expect(button.locator(".copy-label")).toBeVisible({ timeout: 2_000 });
	await expect(page.getByRole("status")).toBeEmpty();
});
