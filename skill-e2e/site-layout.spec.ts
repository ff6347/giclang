// ABOUTME: Verifies Docs sidebar spacing and centered Downloads content in the rendered site.
// ABOUTME: Covers desktop sizing and narrow-screen layouts without horizontal overflow.

import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./support.ts";

for (const route of ["/docs/", "/docs/skill/"]) {
	test(`insets the documentation sidebar on ${route}`, async ({ page }) => {
		await page.goto(route);
		const sidebar = page.locator("aside");
		await expect(sidebar).toBeVisible();
		for (const width of [1280, 375]) {
			await page.setViewportSize({ width, height: 812 });
			const bounds = await sidebar.boundingBox();
			if (!bounds)
				throw new Error("Documentation sidebar has no visible bounds.");
			expect(bounds.x).toBeGreaterThan(0);
			expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
			await expectNoHorizontalOverflow(page);
		}
	});
}

test("centers Downloads in a constrained content column", async ({ page }) => {
	await page.goto("/downloads/");
	const main = page.getByRole("main");
	await expect(main).toBeVisible();
	await expect(
		main.getByRole("heading", { name: "Downloads", exact: true }),
	).toBeVisible();
	for (const width of [1280, 1600, 375]) {
		await page.setViewportSize({ width, height: 812 });
		const bounds = await main.boundingBox();
		if (!bounds) throw new Error("Downloads content has no visible bounds.");
		expect(bounds.x).toBeCloseTo((width - bounds.width) / 2, 0);
		if (width > 1000) {
			expect(bounds.width).toBeLessThan(1000);
			expect(bounds.x).toBeGreaterThan(0);
		}
		await expectNoHorizontalOverflow(page);
	}
});
