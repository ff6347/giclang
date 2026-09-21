// ABOUTME: Verifies bundled Markdown and example visibility through the workspace UI.
// ABOUTME: Covers About, Docs, and disabled example exclusion.

import { expect, test } from "@playwright/test";

test("presents bundled About and documentation content without navigation", async ({
	page,
}) => {
	await page.goto("/");

	await page.getByRole("tab", { name: "About" }).click();
	await expect(
		page.getByText(
			"Gestalten in Code is a small C-style language for creating two-dimensional generative graphics",
		),
	).toBeVisible();
	await expect(page.getByRole("link", { name: "React" })).toBeVisible();
	await expect(page).toHaveURL("/");

	await page.getByRole("tab", { name: "Docs" }).click();
	const docs = page.getByRole("tabpanel", { name: "Docs" });
	await expect(docs.getByRole("button")).toHaveCount(0);
	await expect(docs.getByRole("heading", { level: 2 })).toHaveText([
		"Language reference",
		"Conditions",
		"Drawing",
		"Repeat",
	]);
	await expect(
		page.getByText("Language reference and help for writing GIC programs."),
	).toBeVisible();
	await expect(page).toHaveURL("/");
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
