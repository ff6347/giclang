// ABOUTME: Verifies bundled Markdown and example visibility through the workspace UI.
// ABOUTME: Covers About, Docs, and disabled example exclusion.

import { expect, test } from "@playwright/test";

test("presents bundled About and documentation content without navigation", async ({
	page,
}) => {
	await page.goto("/");

	await page.getByRole("tab", { name: "About" }).click();
	const about = page.getByRole("tabpanel", { name: "About" });
	await expect(about.locator(".content-markdown > *").first()).toBeVisible();
	await expect(page).toHaveURL("/");

	await page.getByRole("tab", { name: "Docs" }).click();
	const docs = page.getByRole("tabpanel", { name: "Docs" });
	await expect(docs.getByRole("button")).toHaveCount(0);
	await expect(docs.getByRole("tab").first()).toBeVisible();
	await expect(docs.locator("h2").first()).toBeVisible();
	await expect(docs.locator(".content-markdown > *").first()).toBeVisible();
	const nextPage = docs.getByRole("tab").nth(1);
	await nextPage.click();
	await expect(nextPage).toHaveAttribute("aria-selected", "true");
	await expect(docs.getByRole("heading", { level: 2 })).toHaveText(
		(await nextPage.innerText()).trim(),
	);
	await expect(page).toHaveURL("/");
});

test("centers Docs, About, and Settings in a 66ch reading column", async ({
	page,
}) => {
	await page.setViewportSize({ height: 800, width: 1500 });
	await page.goto("/");

	for (const name of ["Docs", "About", "Settings"]) {
		await page.getByRole("tab", { name }).click();
		const panel = page
			.getByRole("tabpanel", { name })
			.locator(".workspace-panel:visible")
			.first();
		const column = panel.locator(":scope > *").first();
		const panelBox = await panel.boundingBox();
		const columnBox = await column.boundingBox();
		expect(panelBox, `${name} panel box`).not.toBeNull();
		expect(columnBox, `${name} content box`).not.toBeNull();
		expect(columnBox!.width, `${name} content width`).toBeLessThanOrEqual(700);
		expect(
			columnBox!.x + columnBox!.width / 2,
			`${name} content center`,
		).toBeCloseTo(panelBox!.x + panelBox!.width / 2, 0);
	}

	await page.setViewportSize({ height: 800, width: 480 });
	for (const name of ["Docs", "About", "Settings"]) {
		await page.getByRole("tab", { name }).click();
		const panel = page
			.getByRole("tabpanel", { name })
			.locator(".workspace-panel:visible")
			.first();
		expect(
			await panel.evaluate(
				(element) => element.scrollWidth - element.clientWidth,
			),
			`${name} horizontal overflow`,
		).toBeLessThanOrEqual(1);
	}
});

test("keeps Drawing tables scrollable within a narrow Docs panel", async ({
	page,
}) => {
	await page.setViewportSize({ height: 800, width: 480 });
	await page.goto("/");
	await page.getByRole("tab", { name: "Docs" }).click();

	const docs = page.getByRole("tabpanel", { name: "Docs" });
	await docs.getByRole("tab", { name: "Drawing", exact: true }).click();
	const panel = docs.getByRole("article", { name: "Drawing" });
	const table = panel.locator(".content-table-scroll").first();
	await expect(table).toBeVisible();
	const widths = await table.evaluate((element) => ({
		viewport: element.clientWidth,
		content: element.scrollWidth,
	}));
	expect(widths.content).toBeGreaterThan(widths.viewport);
	await table.evaluate((element) => {
		element.scrollLeft = 100;
	});
	expect(await table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(
		0,
	);
	expect(
		await panel.evaluate(
			(element) => element.scrollWidth - element.clientWidth,
		),
	).toBeLessThanOrEqual(1);
});

test("loads images authored beside a Markdown document", async ({ page }) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Docs" }).click();
	const docs = page.getByRole("tabpanel", { name: "Docs" });
	const image = docs
		.getByRole("article")
		.locator(".content-markdown img")
		.first();
	for (const tab of await docs.getByRole("tab").all()) {
		await tab.click();
		if ((await image.count()) > 0) break;
	}
	await expect(image).toBeVisible();
	await expect
		.poll(() =>
			image.evaluate((element) =>
				element instanceof HTMLImageElement ? element.naturalWidth : 0,
			),
		)
		.toBeGreaterThan(0);
});

test("hides disabled examples from the application", async ({ page }) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Examples" }).click();

	const examples = page.getByRole("tabpanel", { name: "Examples" });
	await expect(
		examples.getByRole("heading", { name: "Examples" }),
	).toBeVisible();
	await expect(examples.getByRole("listitem").first()).toBeVisible();
	await expect(
		examples.getByRole("heading", { name: "An Obvious Circle" }),
	).toHaveCount(0);
});

test("animates overflowing example cards above neighboring cards on hover", async ({
	page,
}) => {
	await page.setViewportSize({ height: 800, width: 1024 });
	await page.goto("/");
	await page.getByRole("tab", { name: "Examples" }).click();

	const cards = page.getByRole("listitem");
	const overflowingCardIndex = await cards.evaluateAll((elements) =>
		elements.findIndex((element, index) => {
			const content = element.querySelector(".content-card-content");
			return (
				index < elements.length - 1 &&
				content instanceof HTMLElement &&
				content.scrollHeight > content.clientHeight
			);
		}),
	);
	expect(overflowingCardIndex).toBeGreaterThanOrEqual(0);
	const card = cards.nth(overflowingCardIndex);
	const neighboringCard = cards.nth(overflowingCardIndex + 1);
	const cardContent = card.locator(".content-card-content");
	const collapsed = await cardContent.boundingBox();
	const neighborBefore = await neighboringCard.boundingBox();

	expect(collapsed).not.toBeNull();
	expect(neighborBefore).not.toBeNull();
	expect(collapsed!.height).toBeCloseTo(288, 0);

	await card.hover();
	await page.waitForTimeout(60);

	const expanding = await cardContent.boundingBox();
	expect(expanding).not.toBeNull();
	expect(expanding!.height).toBeGreaterThan(collapsed!.height);

	await page.waitForTimeout(240);

	const expanded = await cardContent.boundingBox();
	const neighborAfter = await neighboringCard.boundingBox();
	expect(expanded).not.toBeNull();
	expect(neighborAfter).not.toBeNull();
	expect(
		await cardContent.evaluate(
			(element) => getComputedStyle(element).boxShadow,
		),
	).toBe("rgb(0, 0, 0) 3px 3px 0px 0px");
	expect(neighborAfter!.y).toBeCloseTo(neighborBefore!.y, 0);
	expect(
		await card.evaluate((element) => getComputedStyle(element).zIndex),
	).toBe("1");
});
