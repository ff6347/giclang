// ABOUTME: Exercises the public Skill page copy, fallback, source links, and ZIP download.
// ABOUTME: Navigates through site Docs and verifies real Chromium clipboard and archive bytes.

import { expect, test } from "@playwright/test";
import {
	expectDownloadedSkillArchive,
	readCanonicalSkillExport,
} from "../e2e/skill-export.ts";
import {
	activateByKeyboard,
	denyClipboardWritePermission,
	expectNoHorizontalOverflow,
	grantClipboardPermissions,
	readClipboard,
	restoreClipboardPermissions,
} from "./support.ts";

const fallbackTextName = "Skill and language reference text";

test("copies and downloads the complete canonical Skill from site Docs", async ({
	browser,
	page,
}) => {
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
	const copyButton = actions.getByRole("button", {
		name: "Copy skill and reference",
	});
	const status = actions.getByRole("status");
	const fallback = actions.locator("[data-copy-details]");
	const payload = actions.getByRole("textbox", { name: fallbackTextName });

	await grantClipboardPermissions(page);
	await activateByKeyboard(page, copyButton);
	await expect(status).toHaveText("Skill and reference copied.");
	expect(await readClipboard(page)).toBe(expected.copyText);
	expect(expected.copyText).not.toContain("GiC editor agent only");
	for (const toolInstruction of [
		"search_reference",
		"read_reference",
		"search_examples",
	]) {
		expect(expected.copyText).not.toContain(toolInstruction);
	}
	await expect(fallback).toHaveJSProperty("open", false);

	await activateByKeyboard(page, fallback.locator("summary"));
	await expect(payload).toBeVisible();
	await expect(payload).toHaveValue(expected.copyText);
	await expect(payload).toHaveJSProperty("readOnly", true);

	await denyClipboardWritePermission(browser, page);
	await activateByKeyboard(page, copyButton);
	await expect(status).toContainText(
		"Clipboard access is unavailable or was blocked",
	);
	await expect(status).not.toHaveText("Skill and reference copied.");
	await expect(fallback).toHaveJSProperty("open", true);
	await expect(payload).toHaveValue(expected.copyText);
	await expect(payload).toBeFocused();
	expect(
		await payload.evaluate((element) => {
			if (!(element instanceof HTMLTextAreaElement)) {
				throw new Error("Expected the complete copy fallback textarea.");
			}
			return {
				start: element.selectionStart,
				end: element.selectionEnd,
			};
		}),
	).toEqual({ start: 0, end: expected.copyText.length });

	await restoreClipboardPermissions(page);
	await activateByKeyboard(page, copyButton);
	await expect(status).toHaveText("Skill and reference copied.");
	expect(await readClipboard(page)).toBe(expected.copyText);
	await expect(fallback).toHaveJSProperty("open", false);

	const inspectSkill = actions.getByRole("link", {
		name: "Inspect original SKILL.md",
	});
	await inspectSkill.click();
	await expect(page).toHaveURL(/\/skills\/gic-agent\/SKILL\.md$/);
	expect(
		await page.locator("body").evaluate((element) => element.textContent),
	).toBe(expected.skillSource);
	await page.goBack();
	await expect(
		page.getByRole("heading", { name: "Skill", exact: true }),
	).toBeVisible();

	const inspectReference = page.getByRole("link", {
		name: "Inspect language reference",
	});
	await inspectReference.click();
	await expect(page).toHaveURL(
		/\/skills\/gic-agent\/references\/language\.md$/,
	);
	expect(
		await page.locator("body").evaluate((element) => element.textContent),
	).toBe(expected.referenceSource);
	await page.goBack();
	await expect(
		page.getByRole("heading", { name: "Skill", exact: true }),
	).toBeVisible();

	const downloadLink = page.getByRole("link", {
		name: "Download skill (ZIP)",
	});
	const downloadPromise = page.waitForEvent("download");
	await activateByKeyboard(page, downloadLink);
	await expectDownloadedSkillArchive(await downloadPromise, expected);

	await page.setViewportSize({ width: 375, height: 812 });
	await expectNoHorizontalOverflow(page);
});
