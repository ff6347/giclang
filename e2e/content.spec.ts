// ABOUTME: Verifies bundled Markdown and example visibility through the workspace UI.
// ABOUTME: Covers About, Docs, and disabled example exclusion.

import { expect, test } from "@playwright/test";
import { readBundledExample } from "./example-copy.ts";
import { setEditorSource } from "./editor.ts";

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
	await expect(docs.getByRole("button")).toHaveCount(2);
	await expect(
		docs.getByRole("button", { name: "Copy page", exact: true }),
	).toBeVisible();
	await expect(docs.getByRole("tab").first()).toBeVisible();
	await expect(docs.locator("h2").first()).toBeVisible();
	await expect(docs.locator(".content-markdown > *").first()).toBeVisible();
	const nextPage = docs.getByRole("tab").nth(1);
	await nextPage.click();
	await expect(nextPage).toHaveAttribute("aria-selected", "true");
	await expect(docs.getByRole("button")).toHaveCount(2);
	await expect(
		docs.getByRole("button", { name: "Copy page", exact: true }),
	).toBeVisible();
	await expect(docs.getByRole("heading", { level: 2 })).toHaveText(
		(await nextPage.innerText()).trim(),
	);
	await expect(page).toHaveURL("/");
});

test("opens the shared Skill from editor Docs", async ({ page }) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Docs" }).click();

	const docs = page.getByRole("tabpanel", { name: "Docs" });
	const skill = docs.getByRole("tab", { name: "Skill", exact: true });
	await expect(skill).toBeVisible();
	await skill.click();

	const article = docs.getByRole("article", { name: "Skill" });
	await expect(
		article.getByRole("heading", { name: "Skill", exact: true }),
	).toBeVisible();
	await expect(article.locator(".content-markdown")).toContainText("gic-agent");
	await expect(article.locator(".content-markdown")).toContainText(
		"Language reference",
	);
	const skillContent = article.locator(".content-markdown");
	for (const toolInstruction of [
		"GiC editor agent only",
		"search_reference",
		"read_reference",
		"search_examples",
	]) {
		await expect(skillContent).not.toContainText(toolInstruction);
	}
	await expect(
		article.getByRole("link", { name: "View raw skill", exact: true }),
	).toBeVisible();
	await expect(
		article.getByRole("link", { name: "Download skill (ZIP)", exact: true }),
	).toBeVisible();
	await expect(
		skillContent.getByRole("heading", {
			name: "GiC agent skill",
			exact: true,
		}),
	).toBeVisible();
});

test("uses the body font and size for inline and block documentation code", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Docs" }).click();
	const docs = page.getByRole("tabpanel", { name: "Docs" });
	await docs
		.getByRole("tab", { name: "User defined Functions", exact: true })
		.click();
	const article = docs.getByRole("article", { name: "User defined Functions" });
	const inlineCode = article.locator("p code").first();
	const blockCode = article.locator("pre code").first();
	await expect(inlineCode).toBeVisible();
	await expect(blockCode).toBeVisible();
	const bodyFont = await page.locator("body").evaluate((element) => ({
		family: getComputedStyle(element).fontFamily,
		size: getComputedStyle(element).fontSize,
	}));
	for (const code of [inlineCode, blockCode]) {
		await expect(code).toHaveCSS("font-size", bodyFont.size);
		await expect(code).toHaveCSS("font-family", bodyFont.family);
	}
	await expect(inlineCode).toHaveCSS("font-style", "italic");
	const chromeBackground = await page
		.locator(".application-chrome")
		.evaluate((element) => getComputedStyle(element).backgroundColor);
	await expect(inlineCode).toHaveCSS("background-color", chromeBackground);
	await expect(blockCode).toHaveCSS("font-style", "normal");
	await expect(blockCode).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
	const block = article.locator("pre").first();
	await expect(block).toHaveCSS("border-left-width", "0px");
	await expect(block).toHaveCSS("padding-left", "0px");
	await expect(block).toHaveCSS("overflow-x", "auto");
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

test("styles documentation tables without striping named colors", async ({
	page,
}) => {
	await page.setViewportSize({ height: 800, width: 1024 });
	await page.goto("/");
	await page.getByRole("tab", { name: "Docs" }).click();
	const docs = page.getByRole("tabpanel", { name: "Docs" });

	await docs.getByRole("tab", { name: "Drawing", exact: true }).click();
	const drawingTable = docs
		.getByRole("article", { name: "Drawing" })
		.locator(".content-table-scroll")
		.first();
	const drawingStyles = await drawingTable.evaluate((element) => {
		const cells = element.querySelectorAll("tbody tr:first-child > *");
		const rows = element.querySelectorAll("tbody tr");
		const probe = document.createElement("div");
		probe.style.backgroundColor = "var(--color-chrome-light)";
		document.body.append(probe);
		const chromeLightBackground = getComputedStyle(probe).backgroundColor;
		probe.remove();
		return {
			borderTopWidth: getComputedStyle(cells[0]!).borderTopWidth,
			chromeLightBackground,
			chromeLightToken: getComputedStyle(document.documentElement)
				.getPropertyValue("--color-chrome-light")
				.trim(),
			firstRowBackground: getComputedStyle(rows[0]!).backgroundColor,
			marginBottom: getComputedStyle(element).marginBottom,
			paddingBottom: getComputedStyle(cells[0]!).paddingBottom,
			paddingTop: getComputedStyle(cells[0]!).paddingTop,
			secondRowBackground: getComputedStyle(rows[1]!).backgroundColor,
		};
	});
	expect(drawingStyles).toMatchObject({
		borderTopWidth: "1px",
		marginBottom: "16px",
		paddingBottom: "8px",
		paddingTop: "8px",
	});
	expect(drawingStyles.chromeLightToken).not.toBe("");
	expect(drawingStyles.firstRowBackground).toBe(
		drawingStyles.chromeLightBackground,
	);
	expect(drawingStyles.firstRowBackground).not.toBe(
		drawingStyles.secondRowBackground,
	);

	await docs.getByRole("tab", { name: "Named Colors", exact: true }).click();
	const namedColorRows = docs
		.getByRole("article", { name: "Named Colors" })
		.locator("tbody")
		.first()
		.locator(":scope > tr");
	const namedColorBackgrounds = await namedColorRows.evaluateAll((rows) =>
		rows.slice(0, 2).map((row) => getComputedStyle(row).backgroundColor),
	);
	expect(new Set(namedColorBackgrounds).size).toBe(1);
	expect(drawingStyles.secondRowBackground).toBe(namedColorBackgrounds[0]);
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

test("copies bundled examples without inline source or loading them", async ({
	page,
}) => {
	const expected = await readBundledExample();
	await page.goto("/");
	await setEditorSource(page, "point(23, 41);");
	const sourceBefore = await page.locator(".view-line").allTextContents();
	await expect
		.poll(() => page.evaluate(() => localStorage.getItem("gic.recovery.v1")))
		.not.toBeNull();
	const recoveryBefore = await page.evaluate(() =>
		localStorage.getItem("gic.recovery.v1"),
	);
	await page.getByRole("tab", { name: "Examples", exact: true }).click();
	const card = page.locator(".content-card").filter({
		has: page.getByRole("heading", { name: expected.title, exact: true }),
	});
	await card.hover();
	await expect(card.locator("pre, code")).toHaveCount(0);
	const button = card.getByRole("button", {
		name: "Copy to clipboard",
		exact: true,
	});
	await expect(button).toHaveAttribute("aria-label", "Copy to clipboard");
	const label = button.locator(".copy-label");
	const checkmark = button.locator(".copy-confirmation svg");
	await expect(label).toBeVisible();
	await expect(checkmark).toBeHidden();
	const requests: string[] = [];
	page.on("request", (request) => requests.push(request.url()));
	await button.click();
	const feedback = card
		.locator('[role="status"], [role="alert"]')
		.filter({ hasText: /\S/ });
	await expect(feedback).toHaveText(
		/^(Copied to clipboard\.|Could not copy to clipboard\.)$/,
	);
	if ((await feedback.getAttribute("role")) === "status") {
		await expect(feedback).toHaveCSS("clip-path", "inset(50%)");
		await expect(checkmark).toBeVisible();
		await expect(label).toBeHidden();
		await page.waitForTimeout(2_100);
		await expect(card.getByRole("status")).toBeEmpty();
	} else {
		await expect(feedback).toBeVisible();
		await page.waitForTimeout(2_100);
		await expect(feedback).toHaveText("Could not copy to clipboard.");
		await expect(feedback).toBeVisible();
	}
	await expect(checkmark).toBeHidden();
	await expect(label).toBeVisible();
	await expect(card.locator("pre, code, details, textarea")).toHaveCount(0);
	expect(requests).toEqual([]);
	await page.getByRole("tab", { name: "Gestalten", exact: true }).click();
	expect(await page.locator(".view-line").allTextContents()).toEqual(
		sourceBefore,
	);
	expect(
		await page.evaluate(() => localStorage.getItem("gic.recovery.v1")),
	).toBe(recoveryBefore);
	await expect(page.getByRole("alertdialog")).toHaveCount(0);
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
