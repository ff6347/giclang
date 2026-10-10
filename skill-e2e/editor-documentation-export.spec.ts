// ABOUTME: Exercises bundled documentation exports through real clipboard and downloads.
// ABOUTME: Checks complete ordered Markdown, offline actions, feedback, and sketch preservation.

import { readFile } from "node:fs/promises";
import { expect, test, type Download, type Page } from "@playwright/test";
import { readBundledDocumentationExport } from "../e2e/documentation-export.ts";
import { setEditorSource } from "../e2e/editor.ts";

import { activateByKeyboard, expectNoHorizontalOverflow } from "./support.ts";

async function downloadedText(download: Download, filename: string) {
	expect(download.suggestedFilename()).toBe(filename);
	expect(await download.failure()).toBeNull();
	const path = await download.path();
	expect(path).not.toBeNull();
	return readFile(path!, "utf8");
}

async function openExports(page: Page) {
	await page.goto("/");
	await page.getByRole("tab", { name: "Docs", exact: true }).click();
	const docs = page.getByRole("tabpanel", { name: "Docs", exact: true });
	const exports = docs.getByRole("region", { name: "Documentation exports" });
	await expect(exports).toBeVisible();
	return { docs, exports };
}

test("copies and downloads all bundled documentation offline without changing the sketch", async ({
	context,
	page,
}) => {
	const expected = await readBundledDocumentationExport();
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.goto("/");
	await setEditorSource(page, 'point(23, 41);\nprint("keep my sketch");');
	const sourceBefore = await page.locator(".view-line").allTextContents();
	await expect
		.poll(() => page.evaluate(() => localStorage.getItem("gic.recovery.v1")))
		.not.toBeNull();
	const recoveryBefore = await page.evaluate(() =>
		localStorage.getItem("gic.recovery.v1"),
	);
	await page.getByRole("tab", { name: "Docs", exact: true }).click();
	const docs = page.getByRole("tabpanel", { name: "Docs", exact: true });
	await docs.getByRole("tab", { name: "Skill", exact: true }).click();
	const article = docs.getByRole("article", { name: "Skill", exact: true });
	const exports = article.getByRole("region", {
		name: "Documentation exports",
	});
	await expect(exports).toBeVisible();
	await expect(exports).toContainText("may exceed chat input limits");
	await expect(exports).toContainText(/copy one page/i);
	await expect(exports).toContainText(/download/i);
	await expect(
		article.getByRole("button", { name: "Copy page", exact: true }),
	).toBeVisible();
	await expect(
		article.getByRole("region", { name: "Skill actions" }).getByRole("link"),
	).toHaveCount(2);
	await page.evaluate(() => document.fonts.ready);
	await expect
		.poll(() =>
			article.evaluate((element) =>
				Array.from(element.querySelectorAll("img")).every(
					(image) => image.complete,
				),
			),
		)
		.toBe(true);
	const requests: string[] = [];
	page.on("request", (request) => requests.push(request.url()));
	await context.setOffline(true);

	const copy = exports.getByRole("button", {
		name: "Copy all docs",
		exact: true,
	});
	await activateByKeyboard(page, copy);
	await expect(exports.getByRole("status")).toHaveText("Copied to clipboard.");
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
		expected.fullText,
	);
	await expect(article.locator(':scope > [role="status"]')).toBeEmpty();

	for (const [label, filename] of [
		["Download documentation index", "llms.txt"],
		["Download all docs", "llms-full.txt"],
	]) {
		const link = exports.getByRole("link", { name: label, exact: true });
		await expect(link).toHaveAttribute("download", filename!);
		expect(await link.getAttribute("href")).toMatch(/^(data:|blob:)/);
		const pending = page.waitForEvent("download");
		await activateByKeyboard(page, link);
		const text = await downloadedText(await pending, filename!);
		if (filename === "llms-full.txt") {
			expect(text).toBe(expected.fullText);
			expect(text).toContain("## GiC agent skill");
			expect(text).toContain("## Language reference");
		} else {
			expect(text).toMatch(/^# GiC\n\n\S/);
			expect(text).toContain("## Documentation\n");
			const entries = [
				...text.matchAll(
					/\[([^\]]+)\]\((https:\/\/giclang\.cc\/docs\/[^)]+\.md)\)/g,
				),
			];
			expect(entries.map((entry) => [entry[1], entry[2]])).toEqual(
				expected.docs.map((doc) => [
					doc.title,
					`https://giclang.cc/docs/${doc.id}.md`,
				]),
			);
			expect(text).toContain("https://giclang.cc/llms-full.txt");
		}
	}
	expect(requests).toEqual([]);
	await page.setViewportSize({ width: 375, height: 812 });
	await copy.scrollIntoViewIfNeeded();
	await expect(copy).toBeInViewport();
	await expectNoHorizontalOverflow(page);
	expect(
		await article.evaluate(
			(element) => element.scrollWidth - element.clientWidth,
		),
	).toBeLessThanOrEqual(1);
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.getByRole("tab", { name: "Gestalten", exact: true }).click();
	await expect
		.poll(() => page.locator(".view-line").allTextContents())
		.toEqual(sourceBefore);
	expect(
		await page.evaluate(() => localStorage.getItem("gic.recovery.v1")),
	).toBe(recoveryBefore);
	await expect(page.getByRole("alertdialog")).toHaveCount(0);
	await expect(page).toHaveURL("/");
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
	test(`keeps Copy all docs feedback transient and geometry stable (${reducedMotion})`, async ({
		context,
		page,
	}) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.emulateMedia({ reducedMotion });
		const { docs, exports } = await openExports(page);
		const button = exports.getByRole("button", {
			name: "Copy all docs",
			exact: true,
		});
		const label = button.locator(".copy-label");
		const confirmation = button.locator(".copy-confirmation");
		const status = exports.getByRole("status");
		const dimensions = () =>
			button.evaluate((element) => {
				const { width, height } = element.getBoundingClientRect();
				return { width, height };
			});
		await page.evaluate(() => document.fonts.ready);
		await expect(status).toBeEmpty();
		await expect(status).toHaveCSS("clip-path", "inset(50%)");
		const size = await dimensions();
		await activateByKeyboard(page, button);
		await expect(status).toHaveText("Copied to clipboard.");
		await expect(label).toBeHidden();
		await expect(confirmation.locator("svg")).toBeVisible();
		await expect(button).toHaveAccessibleName("Copy all docs");
		expect(await dimensions()).toEqual(size);
		expect(
			await confirmation.evaluate((element) =>
				element
					.getAnimations()
					.map((animation) => animation.effect?.getTiming().duration),
			),
		).toEqual(reducedMotion === "reduce" ? [] : [2_000]);
		await page.waitForTimeout(1_000);
		await expect(label).toBeHidden();
		await expect(label).toBeVisible({ timeout: 2_500 });
		await expect(status).toBeEmpty();
		expect(await dimensions()).toEqual(size);
		await docs.getByRole("tab", { name: "Drawing", exact: true }).click();
		await expect(
			exports.getByRole("button", { name: "Copy all docs", exact: true }),
		).toBeVisible();
	});
}

test("keeps genuine Copy all docs clipboard denial visible and allows retry", async ({
	browser,
	context,
	page,
}) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	const { exports } = await openExports(page);
	const button = exports.getByRole("button", {
		name: "Copy all docs",
		exact: true,
	});
	const cdp = await browser.newBrowserCDPSession();
	const pageSession = await context.newCDPSession(page);
	const { targetInfo } = await pageSession.send("Target.getTargetInfo");
	const scope = {
		origin: new URL(page.url()).origin,
		browserContextId: targetInfo.browserContextId,
	};
	for (const setting of ["denied", "granted"] as const) {
		for (const allowWithoutSanitization of [true, false]) {
			await cdp.send("Browser.setPermission", {
				...scope,
				permission: { name: "clipboard-write", allowWithoutSanitization },
				setting,
			});
		}
		await activateByKeyboard(page, button);
		if (setting === "denied") {
			const alert = exports.getByRole("alert");
			await expect(alert).toHaveText("Could not copy to clipboard.");
			await expect(alert).toBeVisible();
			await expect(alert).toHaveCSS("clip-path", "none");
			await expect(exports.getByRole("status")).toBeEmpty();
			await page.waitForTimeout(2_100);
			await expect(alert).toBeVisible();
			await expect(button.locator(".copy-label")).toBeVisible();
		} else {
			await expect(exports.getByRole("alert")).toHaveCount(0);
			await expect(exports.getByRole("status")).toHaveText(
				"Copied to clipboard.",
			);
			expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
				(await readBundledDocumentationExport()).fullText,
			);
		}
	}
	await expect(exports.locator("details, textarea")).toHaveCount(0);
	await pageSession.detach();
	await cdp.detach();
});
