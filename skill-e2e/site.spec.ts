// ABOUTME: Verifies the site exposes raw-skill and ZIP links with exact source output.
// ABOUTME: Checks local popup navigation, keyboard download, and narrow layout in Chromium.

import { expect, test } from "@playwright/test";
import {
	expectDownloadedSkillArchive,
	readCanonicalSkillExport,
} from "../e2e/skill-export.ts";
import { activateByKeyboard, expectNoHorizontalOverflow } from "./support.ts";

const skillLinkNames = ["Download skill (ZIP)", "View raw skill"];

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
