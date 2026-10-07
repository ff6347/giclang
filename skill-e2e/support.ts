// ABOUTME: Shares keyboard activation and narrow-layout assertions for Skill tests.
// ABOUTME: Keeps browser interaction on visible controls without API stubs.

import { expect, type Locator, type Page } from "@playwright/test";

export async function activateByKeyboard(page: Page, locator: Locator) {
	await locator.focus();
	await page.keyboard.press("Enter");
}

export async function expectNoHorizontalOverflow(page: Page) {
	const overflow = await page.evaluate(
		() =>
			document.documentElement.scrollWidth -
			document.documentElement.clientWidth,
	);
	expect(overflow).toBeLessThanOrEqual(1);
}
