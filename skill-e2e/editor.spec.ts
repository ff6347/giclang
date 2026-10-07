// ABOUTME: Exercises Skill copy, fallback, source inspection, and ZIP download in the editor.
// ABOUTME: Uses real Chromium permissions, clipboard contents, Monaco input, and recovery storage.

import { expect, test } from "@playwright/test";
import { setEditorSource } from "../e2e/editor.ts";
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

test("copies and downloads the complete canonical Skill from editor Docs", async ({
	browser,
	page,
}) => {
	const expected = await readCanonicalSkillExport();
	const source = "point(23, 41);";
	await page.goto("/");
	await expect(
		page.getByRole("alertdialog", { name: "Recover unsaved sketch?" }),
	).toHaveCount(0);
	await setEditorSource(page, source);
	const sourceBefore = await page.locator(".view-line").allTextContents();
	expect(sourceBefore.map((line) => line.replace(/\u00a0/g, " "))).toEqual([
		source,
	]);
	const recoveryBefore = await page.evaluate(() =>
		localStorage.getItem("gic.recovery.v1"),
	);
	expect(recoveryBefore).not.toBeNull();

	await page.getByRole("tab", { name: "Docs", exact: true }).click();
	const docs = page.getByRole("tabpanel", { name: "Docs" });
	await docs.getByRole("tab", { name: "Skill", exact: true }).click();
	const article = docs.getByRole("article", { name: "Skill" });
	const copyButton = article.getByRole("button", {
		name: "Copy skill and reference",
	});
	const status = article.getByRole("status");
	const fallback = article.locator("details").first();
	const payload = article.getByRole("textbox", { name: fallbackTextName });

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

	const sourceDetails = article.locator("details").nth(1);
	const inspect = sourceDetails.locator("summary");
	await activateByKeyboard(page, inspect);
	expect(await sourceDetails.locator("pre").nth(0).textContent()).toBe(
		expected.skillSource,
	);
	expect(await sourceDetails.locator("pre").nth(1).textContent()).toBe(
		expected.referenceSource,
	);
	await activateByKeyboard(page, inspect);

	const downloadButton = article.getByRole("button", {
		name: "Download skill (ZIP)",
	});
	const downloadPromise = page.waitForEvent("download");
	await activateByKeyboard(page, downloadButton);
	await expectDownloadedSkillArchive(await downloadPromise, expected);

	await page.setViewportSize({ width: 375, height: 812 });
	await expectNoHorizontalOverflow(page);
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.getByRole("tab", { name: "Gestalten", exact: true }).click();
	expect(await page.locator(".view-line").allTextContents()).toEqual(
		sourceBefore,
	);
	expect(
		await page.evaluate(() => localStorage.getItem("gic.recovery.v1")),
	).toBe(recoveryBefore);
	await expect(
		page.getByRole("alertdialog", { name: "Recover unsaved sketch?" }),
	).toHaveCount(0);
});
