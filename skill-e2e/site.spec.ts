// ABOUTME: Verifies the site exposes raw-skill and ZIP links with exact source output.
// ABOUTME: Checks local popup navigation, keyboard download, and narrow layout in Chromium.

import { expect, test } from "@playwright/test";
import {
	expectDownloadedSkillArchive,
	readCanonicalSkillExport,
} from "../e2e/skill-export.ts";
import { activateByKeyboard, expectNoHorizontalOverflow } from "./support.ts";
import { readBundledExample } from "../e2e/example-copy.ts";

const skillLinkNames = ["Download skill (ZIP)", "View raw skill"];

test("keeps example cards compact and opens full source through thumbnail and title", async ({
	page,
}) => {
	const expected = await readBundledExample();
	await page.goto("/");
	await page
		.getByRole("navigation", { name: "Main navigation" })
		.getByRole("link", { name: "examples", exact: true })
		.click();
	const cards = page.locator(".content-card");
	await expect(cards.first()).toBeVisible();
	const size = await page.evaluate(
		() => 18 * parseFloat(getComputedStyle(document.documentElement).fontSize),
	);
	for (const box of await cards.evaluateAll((elements) =>
		elements.map((element) => {
			const box = element.getBoundingClientRect();
			return { width: box.width, height: box.height };
		}),
	)) {
		expect(box.width).toBeCloseTo(size, 0);
		expect(box.height).toBeCloseTo(size, 0);
	}
	await expect(page.locator("main pre")).toHaveCount(0);
	const thumbnail = page.getByRole("link", {
		name: `${expected.title} thumbnail`,
		exact: true,
	});
	await thumbnail.click();
	await expect(page).toHaveURL(new RegExp(`/examples/${expected.id}/$`));
	const article = page.getByRole("article", {
		name: expected.title,
		exact: true,
	});
	expect(await article.locator("pre > code").textContent()).toBe(
		expected.source,
	);
	await expect(article.locator("pre > code")).toBeVisible();
	await expect(page.locator("canvas, iframe, textarea, details")).toHaveCount(
		0,
	);
	await activateByKeyboard(
		page,
		page.getByRole("link", { name: "Back to examples", exact: true }),
	);
	await expect(page).toHaveURL(/\/examples\/$/);
	await activateByKeyboard(
		page,
		page
			.getByRole("heading", { name: expected.title, exact: true })
			.getByRole("link"),
	);
	await expect(page).toHaveURL(new RegExp(`/examples/${expected.id}/$`));
	expect(
		await page
			.getByRole("article", { name: expected.title, exact: true })
			.locator("pre > code")
			.textContent(),
	).toBe(expected.source);
	await page.setViewportSize({ width: 375, height: 812 });
	await expectNoHorizontalOverflow(page);
	await page
		.getByRole("link", { name: "Back to examples", exact: true })
		.click();
	await expectNoHorizontalOverflow(page);
	for (const box of await cards.evaluateAll((elements) =>
		elements.map((element) => {
			const box = element.getBoundingClientRect();
			return { width: box.width, height: box.height };
		}),
	)) {
		expect(box.height).toBeCloseTo(size, 0);
		expect(box.width).toBeLessThanOrEqual(size + 1);
	}
	const longestTitleIndex = await cards.evaluateAll((elements) =>
		elements
			.slice(0, -1)
			.reduce(
				(longest, element, index, candidates) =>
					(element.querySelector("h2")?.textContent?.length ?? 0) >
					(candidates[longest]?.querySelector("h2")?.textContent?.length ?? 0)
						? index
						: longest,
				0,
			),
	);
	const links = cards.nth(longestTitleIndex).getByRole("link");
	await expect(links).toHaveCount(2);
	await links.first().focus();
	await page.keyboard.press("Tab");
	await expect(links.nth(1)).toBeFocused();
	await page.keyboard.press("Tab");
	await expect(
		cards
			.nth(longestTitleIndex + 1)
			.getByRole("link")
			.first(),
	).toBeFocused();
});

test("exposes only raw-skill and ZIP links in site Docs", async ({ page }) => {
	const expected = await readCanonicalSkillExport();
	await page.goto("/");
	await page
		.getByRole("navigation", { name: "Main navigation" })
		.getByRole("link", { name: "docs", exact: true })
		.click();
	await page
		.getByRole("navigation", { name: "Documentation" })
		.getByRole("link", { name: "Skill", exact: true })
		.click();
	await expect(
		page.getByRole("heading", { name: "Skill", exact: true }),
	).toBeVisible();

	const actions = page.getByRole("region", { name: "Skill actions" });
	const links = actions.getByRole("link");
	await expect(links).toHaveCount(2);
	expect(await links.allTextContents()).toEqual(skillLinkNames);
	await expect(actions.getByRole("button")).toHaveCount(0);
	expect(
		await actions.locator("details, textarea, [role=status]").count(),
	).toBe(0);
	expect(
		await actions.evaluate((element) => {
			const style = getComputedStyle(element);
			return {
				display: style.display,
				flexWrap: style.flexWrap,
				columnGap: style.columnGap,
				rowGap: style.rowGap,
				linkDecorations: Array.from(
					element.querySelectorAll("a"),
					(link) => getComputedStyle(link).textDecorationLine,
				),
			};
		}),
	).toEqual({
		display: "flex",
		flexWrap: "wrap",
		columnGap: "12px",
		rowGap: "12px",
		linkDecorations: ["underline", "underline"],
	});

	const downloadLink = links.nth(0);
	expect(await downloadLink.getAttribute("download")).not.toBeNull();
	const downloadURL = new URL(
		(await downloadLink.getAttribute("href")) ?? "",
		page.url(),
	);
	expect(downloadURL.origin).toBe(new URL(page.url()).origin);
	expect(downloadURL.pathname).toBe("/skills/gic-agent.zip");

	const rawLink = links.nth(1);
	await expect(rawLink).toHaveAttribute("target", "_blank");
	const rawURL = new URL(
		(await rawLink.getAttribute("href")) ?? "",
		page.url(),
	);
	expect(rawURL.origin).toBe(new URL(page.url()).origin);
	expect(rawURL.pathname).toBe("/skills/gic-agent.txt");
	const popupPromise = page.waitForEvent("popup");
	const responsePromise = page
		.context()
		.waitForEvent("response", (response) => response.url() === rawURL.href);
	await activateByKeyboard(page, rawLink);
	const [rawPage, rawResponse] = await Promise.all([
		popupPromise,
		responsePromise,
	]);
	try {
		await expect(rawPage).toHaveURL(rawURL.href);
		await rawPage.waitForLoadState("domcontentloaded");
		expect(rawResponse.status()).toBe(200);
		expect(rawResponse.headers()["content-type"]).toContain("text/plain");
		expect(await rawPage.locator("body").textContent()).toBe(expected.rawText);
	} finally {
		await rawPage.close();
	}

	const downloadPromise = page.waitForEvent("download");
	await activateByKeyboard(page, downloadLink);
	await expectDownloadedSkillArchive(await downloadPromise, expected);

	await page.setViewportSize({ width: 375, height: 812 });
	await expectNoHorizontalOverflow(page);
});
