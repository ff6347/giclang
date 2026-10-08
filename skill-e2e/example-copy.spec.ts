// ABOUTME: Exercises real example clipboard success and denial on both hosts.
// ABOUTME: Verifies selectable source, error-only feedback, and sketch preservation.

import { expect, test } from "@playwright/test";
import { setEditorSource } from "../e2e/editor.ts";
import { readBundledExample } from "../e2e/example-copy.ts";
import { activateByKeyboard, expectNoHorizontalOverflow } from "./support.ts";

test("copies bundled example text and reports clipboard denial without fallback UI", async ({
	browser,
	context,
	page,
}, info) => {
	const editor = info.project.name.startsWith("editor");
	const expected = await readBundledExample();
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.goto("/");
	let sourceBefore: string[] = [];
	let recoveryBefore: string | null = null;
	if (editor) {
		await setEditorSource(page, 'point(23, 41);\nprint("keep my sketch");');
		sourceBefore = await page.locator(".view-line").allTextContents();
		await expect
			.poll(() => page.evaluate(() => localStorage.getItem("gic.recovery.v1")))
			.not.toBeNull();
		recoveryBefore = await page.evaluate(() =>
			localStorage.getItem("gic.recovery.v1"),
		);
		await page.getByRole("tab", { name: "Examples", exact: true }).click();
	} else {
		await page
			.getByRole("navigation", { name: "Main navigation" })
			.getByRole("link", { name: "examples", exact: true })
			.click();
		await expect(page).toHaveURL(/\/examples\/$/);
		await expect(page.locator("canvas, iframe, textarea")).toHaveCount(0);
		await expect(page.getByRole("button", { name: /Run|Load/ })).toHaveCount(0);
	}
	const cards = page.locator(".content-card");
	const card = cards.filter({
		has: page.getByRole("heading", { name: expected.title, exact: true }),
	});
	await card.hover();
	const code = card.locator("pre > code");
	await expect(code).toHaveText(expected.source);
	expect(await code.textContent()).toBe(expected.source);
	await expect(code).toBeVisible();
	expect(
		await code.evaluate((element) => getComputedStyle(element).userSelect),
	).not.toBe("none");
	const button = card.getByRole("button", {
		name: "Copy to clipboard",
		exact: true,
	});
	const requests: string[] = [];
	page.on("request", (request) => requests.push(request.url()));
	await activateByKeyboard(page, button);
	await expect(card.getByRole("status")).toHaveText("Copied to clipboard.");
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
		expected.copyText,
	);
	const countsBefore = await card
		.locator("details, textarea, pre, code")
		.count();
	const cdp = await browser.newBrowserCDPSession();
	const pageSession = await context.newCDPSession(page);
	const { targetInfo } = await pageSession.send("Target.getTargetInfo");
	const permissionScope = {
		origin: new URL(page.url()).origin,
		browserContextId: targetInfo.browserContextId,
	};
	for (const allowWithoutSanitization of [true, false]) {
		await cdp.send("Browser.setPermission", {
			...permissionScope,
			permission: { name: "clipboard-write", allowWithoutSanitization },
			setting: "denied",
		});
	}
	await activateByKeyboard(page, button);
	await expect(card.getByRole("alert")).toHaveText(
		"Could not copy to clipboard.",
	);
	await expect(card.getByRole("status")).toHaveCount(0);
	expect(await card.locator("details, textarea, pre, code").count()).toBe(
		countsBefore,
	);
	await expect(card.locator("details, textarea")).toHaveCount(0);
	expect(await code.textContent()).toBe(expected.source);
	if (editor) {
		await page.setViewportSize({ width: 1280, height: 320 });
		const content = card.locator(".content-card-content");
		await content.hover({ position: { x: 20, y: 200 } });
		await page.mouse.wheel(0, 5000);
		await expect
			.poll(() => content.evaluate((element) => element.scrollTop))
			.toBeGreaterThan(0);
		await code.locator("..").focus();
		await code.locator("..").press("End");

		await expect
			.poll(() =>
				code.evaluate((element) => {
					const text = element.firstChild;
					if (!text?.textContent) return false;
					const range = document.createRange();
					const end = text.textContent.trimEnd().length;
					range.setStart(text, end - 1);
					range.setEnd(text, end);
					const last = range.getBoundingClientRect();
					const card = element
						.closest(".content-card-content")
						?.getBoundingClientRect();
					return (
						!!card &&
						last.top >= card.top &&
						last.bottom <= Math.min(card.bottom, innerHeight)
					);
				}),
			)
			.toBe(true);
		const alert = card.getByRole("alert");
		await alert.scrollIntoViewIfNeeded();
		await expect
			.poll(() =>
				alert.evaluate((element) => {
					const box = element.getBoundingClientRect();
					const card = element
						.closest(".content-card-content")
						?.getBoundingClientRect();
					return (
						!!card &&
						box.top >= card.top &&
						box.bottom <= Math.min(card.bottom, innerHeight)
					);
				}),
			)
			.toBe(true);
		await page.setViewportSize({ width: 1280, height: 720 });
	}
	for (const allowWithoutSanitization of [true, false]) {
		await cdp.send("Browser.setPermission", {
			...permissionScope,
			permission: { name: "clipboard-write", allowWithoutSanitization },
			setting: "granted",
		});
	}
	await activateByKeyboard(page, button);
	await expect(card.getByRole("status")).toHaveText("Copied to clipboard.");
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
		expected.copyText,
	);
	expect(requests).toEqual([]);
	await page.setViewportSize({ width: 375, height: 812 });
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					document.documentElement.scrollWidth -
					document.documentElement.clientWidth,
			),
		)
		.toBeLessThanOrEqual(1);
	await expectNoHorizontalOverflow(page);
	if (editor) {
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.getByRole("tab", { name: "Gestalten", exact: true }).click();
		await expect
			.poll(() => page.locator(".view-line").allTextContents())
			.toEqual(sourceBefore);
		expect(
			await page.evaluate(() => localStorage.getItem("gic.recovery.v1")),
		).toBe(recoveryBefore);
		await expect(page.getByRole("alertdialog")).toHaveCount(0);
	}
});
