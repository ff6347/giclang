// ABOUTME: Verifies transient editor copy confirmation with the real clipboard.
// ABOUTME: Covers fixed button geometry, independent cards, repeat copying, and reduced motion.

import { expect, test, type Locator, type Page } from "@playwright/test";
import { readBundledExample } from "../e2e/example-copy.ts";
import { activateByKeyboard, expectNoHorizontalOverflow } from "./support.ts";

async function openExample(page: Page, title: string) {
	await page.goto("/");
	await page.getByRole("tab", { name: "Examples", exact: true }).click();
	const card = page.locator(".content-card").filter({
		has: page.getByRole("heading", { name: title, exact: true }),
	});
	await card.hover();
	await page.evaluate(() => document.fonts.ready);
	await expect
		.poll(() =>
			card
				.locator(".content-card-content")
				.evaluate((element) => element.getAnimations().length),
		)
		.toBe(0);
	return card;
}

async function dimensions(element: Locator) {
	return element.evaluate((element) => {
		const { width, height } = element.getBoundingClientRect();
		return { width, height };
	});
}

for (const reducedMotion of ["no-preference", "reduce"] as const) {
	test(`shows a transient editor checkmark without resizing the copy button (${reducedMotion})`, async ({
		context,
		page,
	}) => {
		const example = await readBundledExample();
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.emulateMedia({ reducedMotion });
		const card = await openExample(page, example.title);
		await expect(card.getByRole("status")).toBeEmpty();
		const button = card.getByRole("button", {
			name: "Copy to clipboard",
			exact: true,
		});
		const label = button.locator(".copy-label");
		const confirmation = button.locator(".copy-confirmation");
		const size = await dimensions(button);
		const contentSize = await dimensions(card.locator(".example-card-body"));
		await activateByKeyboard(page, button);
		await expect(confirmation.locator("svg")).toBeVisible();
		await expect(label).toBeHidden();
		await expect(button).toHaveAccessibleName("Copy to clipboard");
		expect(await dimensions(button)).toEqual(size);
		expect(await dimensions(card.locator(".example-card-body"))).toEqual(
			contentSize,
		);
		const status = card.getByRole("status");
		await expect(status).toHaveText("Copied to clipboard.");
		expect(
			await status.evaluate((element) => getComputedStyle(element).clipPath),
		).toBe("inset(50%)");
		expect(
			await confirmation.evaluate((element) => element.getAnimations().length),
		).toBe(reducedMotion === "reduce" ? 0 : 1);
		expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
			example.copyText,
		);
		await expect(
			page
				.locator(".content-card")
				.filter({
					hasNot: page.getByRole("heading", {
						name: example.title,
						exact: true,
					}),
				})
				.locator(".copy-confirmation:visible"),
		).toHaveCount(0);
		await expect(label).toBeVisible({ timeout: 3_500 });
		await expect(confirmation).toBeHidden();
		await expect(status).toBeEmpty();
		expect(await dimensions(button)).toEqual(size);
		await page.setViewportSize({ width: 375, height: 812 });
		await card.hover();
		await expect
			.poll(() =>
				card
					.locator(".content-card-content")
					.evaluate((element) => element.getAnimations().length),
			)
			.toBe(0);
		const narrowSize = await dimensions(button);
		await button.click();
		await expect(confirmation.locator("svg")).toBeVisible();
		expect(await dimensions(button)).toEqual(narrowSize);
		await expectNoHorizontalOverflow(page);
		await expect(label).toBeVisible({ timeout: 3_500 });
		expect(await dimensions(button)).toEqual(narrowSize);
	});
}

test("restarts editor copy confirmation when copying again before it disappears", async ({
	context,
	page,
}) => {
	const example = await readBundledExample();
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	const card = await openExample(page, example.title);
	const button = card.getByRole("button", {
		name: "Copy to clipboard",
		exact: true,
	});
	const confirmation = button.locator(".copy-confirmation");
	await button.click();
	await expect(confirmation.locator("svg")).toBeVisible();
	const firstDeadline = await confirmation.evaluate(
		(element) => Number(element.getAnimations()[0]!.startTime) + 2_000,
	);
	await expect
		.poll(() =>
			confirmation.evaluate((element) =>
				Number(element.getAnimations()[0]?.currentTime ?? 0),
			),
		)
		.toBeGreaterThan(1_000);
	await button.click();
	expect(await page.evaluate(() => performance.now())).toBeLessThan(
		firstDeadline,
	);
	await expect(confirmation.locator("svg")).toBeVisible();
	// Cross the first confirmation's deadline while the second is still active.
	await page.waitForTimeout(1_100);
	await expect(button.locator(".copy-label")).toBeHidden();
	await expect(card.getByRole("status")).toHaveText("Copied to clipboard.");
	await expect(button.locator(".copy-label")).toBeVisible({ timeout: 2_000 });
	await expect(card.getByRole("status")).toBeEmpty();
});
