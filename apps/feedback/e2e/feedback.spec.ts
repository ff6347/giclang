// ABOUTME: Exercises the anonymous feedback questionnaire through real browser interactions.
// ABOUTME: Covers progressive enhancement, native validation, submission, and responsive tables.

import { expect, test } from "@playwright/test";

const participantPassword = "test-participant-password";

async function login(page: import("@playwright/test").Page) {
	await page.goto("/");
	await page.getByLabel("Participant password").fill(participantPassword);
	await page.getByRole("button", { name: "Continue" }).click();
	await expect(page).toHaveURL(/\/form$/);
}

test("submits the questionnaire after a native validation error and caps added wishes", async ({
	page,
}) => {
	await login(page);

	const b1Rows = page
		.locator("section")
		.filter({
			has: page.getByRole("heading", {
				name: "Section B: Concepts and GiC without AI",
			}),
		})
		.locator(".rating-table-wrap")
		.first()
		.locator("tbody tr");
	await expect(b1Rows).toHaveCount(9);
	await expect(b1Rows.nth(0).locator('input[type="radio"]')).toHaveCount(5);
	await expect(b1Rows.nth(8).locator('input[type="radio"]')).toHaveCount(5);
	await expect(page.locator("code").filter({ hasText: "if" })).toHaveCount(1);
	await expect(page.locator("#wishes")).toContainText(
		"As a user I want to be able to",
	);

	await page
		.getByLabel(
			"Describe one moment when GiC's simplicity helped you or got in your way.",
		)
		.fill("I could follow the drawing state.");
	await page
		.getByLabel("As a user I want to be able to")
		.fill("draw a pattern");
	await page
		.getByLabel(
			"Describe one suggestion you received from AI. What did you do with it, and how did it affect your understanding?",
		)
		.fill("I changed the suggested loop to see how the image changed.");
	const purposes = page.getByRole("group", {
		name: "During this workshop, what did you use AI help for?",
	});
	await expect(purposes.getByRole("checkbox")).toHaveCount(7);
	await purposes.getByLabel("Get a hint about what to try next").check();
	await purposes
		.getByLabel("Understand a programming concept or existing code")
		.check();
	await page
		.getByRole("group", {
			name: "Using AI helped me make progress on my sketch more quickly.",
		})
		.getByLabel("Agree", { exact: true })
		.check();
	await page.getByRole("button", { name: "Submit feedback" }).click();
	await expect(page).toHaveURL(/\/form$/);
	await expect(
		page.getByLabel(
			"Describe one moment when GiC's simplicity helped you or got in your way.",
		),
	).toHaveValue("I could follow the drawing state.");
	await expect(page.getByLabel("As a user I want to be able to")).toHaveValue(
		"draw a pattern",
	);

	await page.getByLabel(/I agree that my anonymous answers/).check();
	for (let index = 1; index < 20; index += 1)
		await page.getByRole("button", { name: "+ Add another" }).click();
	await expect(page.locator(".wish-row")).toHaveCount(20);
	await expect(
		page.getByRole("button", { name: "+ Add another" }),
	).toBeDisabled();

	await page.getByRole("button", { name: "Submit feedback" }).click();
	await expect(page).toHaveURL(/\/thanks$/);
	await expect(page.getByRole("heading", { name: "Thank you" })).toBeVisible();
	await page.goBack();
	await expect(page).toHaveURL(/\/form$/);
	await expect(
		page.getByRole("button", { name: "Submit feedback" }),
	).toBeEnabled();
});

test("uses only local shared styles and contains table overflow on narrow screens", async ({
	page,
}, testInfo) => {
	const requests: string[] = [];
	page.on("request", (request) => requests.push(request.url()));

	await login(page);

	const formBounds = await page.locator("main").boundingBox();
	expect(formBounds).not.toBeNull();
	expect(formBounds!.width).toBeLessThanOrEqual(960);
	expect(formBounds!.x).toBeCloseTo(
		(page.viewportSize()!.width - formBounds!.width) / 2,
		0,
	);
	await expect(page.locator('link[href="/assets/tokens.css"]')).toHaveCount(1);
	await expect(page.locator('link[href="/assets/feedback.css"]')).toHaveCount(
		1,
	);
	await expect(page.locator("body")).toHaveCSS(
		"font-family",
		/"IBM Plex Mono"/,
	);
	const textColor = await page
		.locator("body")
		.evaluate((body) => getComputedStyle(body).color);
	for (const selector of ["thead .opt-out", "tbody .opt-out"]) {
		await expect(page.locator(selector).first()).toHaveCSS(
			"border-left-style",
			"double",
		);
		await expect(page.locator(selector).first()).toHaveCSS(
			"border-left-color",
			textColor,
		);
	}
	await page.evaluate(() => document.fonts.ready);
	expect(
		requests.some((url) =>
			url.endsWith("/assets/fonts/IBMPlexMono-Regular.ttf"),
		),
	).toBeTruthy();
	expect(
		requests.every((url) => new URL(url).origin === "http://127.0.0.1:4174"),
	).toBeTruthy();
	expect(
		await page
			.locator("html")
			.evaluate((html) => html.scrollWidth <= html.clientWidth),
	).toBeTruthy();
	await page
		.getByRole("heading", { name: "Section B: Concepts and GiC without AI" })
		.scrollIntoViewIfNeeded();
	await page.screenshot({ path: testInfo.outputPath("feedback.png") });

	await page.setViewportSize({ width: 320, height: 800 });
	const overflow = await page
		.locator(".rating-table-wrap")
		.evaluateAll((tables) =>
			tables.map((table) => ({
				clientWidth: table.clientWidth,
				scrollWidth: table.scrollWidth,
			})),
		);
	expect(
		overflow.some((table) => table.scrollWidth > table.clientWidth),
	).toBeTruthy();
	expect(
		await page
			.locator("html")
			.evaluate((html) => html.scrollWidth <= html.clientWidth),
	).toBeTruthy();
});

test.describe("without JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("keeps twenty optional wishes available and submits them", async ({
		page,
	}) => {
		await login(page);
		await expect(page.locator('input[name="want"]')).toHaveCount(20);
		await expect(page.locator('input[name="so_that"]')).toHaveCount(20);

		await page.getByLabel(/I agree that my anonymous answers/).check();
		await page
			.locator('input[name="so_that"]')
			.nth(19)
			.fill("I can make patterns");
		await page.getByLabel("Generate code", { exact: true }).check();
		await page
			.getByRole("group", {
				name: "Using AI helped me make progress on my sketch more quickly.",
			})
			.getByLabel("Can't say / did not use AI")
			.check();
		await page.getByRole("button", { name: "Submit feedback" }).click();
		await expect(page).toHaveURL(/\/thanks$/);
	});
});
