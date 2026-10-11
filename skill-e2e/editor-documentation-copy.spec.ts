// ABOUTME: Exercises complete documentation copying through the real editor and clipboard.
// ABOUTME: Verifies accessible feedback, permission denial, navigation, and sketch preservation.

import {
	expect,
	test,
	type Locator,
	type Page,
	type Request,
} from "@playwright/test";
import { readBundledDocumentation } from "../e2e/documentation-copy.ts";
import { setEditorSource } from "../e2e/editor.ts";
import { readCanonicalSkillExport } from "../e2e/skill-export.ts";
import { activateByKeyboard, expectNoHorizontalOverflow } from "./support.ts";

async function openDocumentation(page: Page, id: string) {
	const expected = await readBundledDocumentation(id);
	const docs = page.getByRole("tabpanel", { name: "Docs", exact: true });
	await docs.getByRole("tab", { name: expected.title, exact: true }).click();
	const article = docs.getByRole("article", {
		name: expected.title,
		exact: true,
	});
	await expect(article).toBeVisible();
	await expect(article).toHaveAttribute("data-document-id", id);
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
	return { article, expected };
}

function readClipboard(page: Page) {
	return page.evaluate(() => navigator.clipboard.readText());
}

function copyButton(article: Locator) {
	return article.getByRole("button", { name: "Copy page", exact: true });
}

function dimensions(element: Locator) {
	return element.evaluate((element) => {
		const { width, height } = element.getBoundingClientRect();
		return { width, height };
	});
}

async function expectNarrowDocumentation(page: Page, article: Locator) {
	await page.setViewportSize({ width: 375, height: 812 });
	await copyButton(article).scrollIntoViewIfNeeded();
	await expect(copyButton(article)).toBeInViewport();
	await expectNoHorizontalOverflow(page);
	expect(
		await article.evaluate(
			(element) => element.scrollWidth - element.clientWidth,
		),
	).toBeLessThanOrEqual(1);
}

test("copies complete displayed pages while navigating Docs without changing the sketch", async ({
	context,
	page,
}) => {
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
	const canonical = await readCanonicalSkillExport();
	const copiedPages: string[] = [];

	for (const id of ["skill", "language-reference", "drawing", "functions"]) {
		const { article, expected } = await openDocumentation(page, id);
		const button = copyButton(article);
		await expect(article.getByRole("button")).toHaveCount(2);
		await expect(button).toHaveAccessibleName("Copy page");
		await expect(article.locator("details, textarea")).toHaveCount(0);
		if (id === "skill") {
			const actions = article.getByRole("region", { name: "Skill actions" });
			await expect(actions.getByRole("button")).toHaveCount(0);
			expect(await actions.getByRole("link").allTextContents()).toEqual([
				"Download skill (ZIP)",
				"View raw skill",
			]);
			const zip = actions.getByRole("link").nth(0);
			await expect(zip).toHaveAttribute("download", "gic-agent.zip");
			await expect(zip).toHaveAttribute(
				"href",
				`data:application/zip;base64,${canonical.archiveBase64}`,
			);
			const raw = actions.getByRole("link").nth(1);
			await expect(raw).toHaveAttribute(
				"href",
				"https://giclang.cc/skills/gic-agent.txt",
			);
			await expect(raw).toHaveAttribute("target", "_blank");
			await expect(raw).toHaveAttribute("rel", "noopener noreferrer");
			expect(expected.copyText).toContain("## Use a skill");
			expect(expected.copyText).toContain("## GiC agent skill");
			expect(expected.copyText).toContain("## Language reference");
			expect(expected.copyText).not.toBe(canonical.rawText);
		}
		const requests: string[] = [];
		const recordRequest = (request: Request) => requests.push(request.url());
		page.on("request", recordRequest);
		await activateByKeyboard(page, button);
		await expect(article.locator(':scope > [role="status"]')).toHaveText(
			"Copied to clipboard.",
		);
		const copied = await readClipboard(page);
		expect(copied).toBe(expected.copyText);
		expect(copied).toBe(`# ${expected.title}\n\n${expected.markdown}`);
		if (id === "drawing") expect(copied).toContain("https://giclang.cc/");
		copiedPages.push(copied);
		await expect(article.locator("details, textarea")).toHaveCount(0);
		expect(requests).toEqual([]);
		page.off("request", recordRequest);
		await expectNarrowDocumentation(page, article);
		await page.setViewportSize({ width: 1280, height: 720 });
	}
	expect(new Set(copiedPages).size).toBe(4);
	await expect(page).toHaveURL("/");
	await page.getByRole("tab", { name: "Gestalten", exact: true }).click();
	await expect
		.poll(() => page.locator(".view-line").allTextContents())
		.toEqual(sourceBefore);
	expect(
		await page.evaluate(() => localStorage.getItem("gic.recovery.v1")),
	).toBe(recoveryBefore);
	await expect(page.getByRole("alertdialog")).toHaveCount(0);
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
	test(`keeps Copy page geometry and accessible name through two-second feedback (${reducedMotion})`, async ({
		context,
		page,
	}) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.emulateMedia({ reducedMotion });
		await page.goto("/");
		await page.getByRole("tab", { name: "Docs", exact: true }).click();
		const { article, expected } = await openDocumentation(page, "functions");
		const button = copyButton(article);
		const label = button.locator(".copy-label");
		const confirmation = button.locator(".copy-confirmation");
		const status = article.locator(':scope > [role="status"]');
		await expect(status).toBeEmpty();
		await expect(status).toHaveCSS("clip-path", "inset(50%)");
		const size = await dimensions(button);

		await activateByKeyboard(page, button);
		await expect(status).toHaveText("Copied to clipboard.");
		const successTime = await page.evaluate(() => performance.now());
		await expect(confirmation.locator("svg")).toBeVisible();
		await expect(confirmation).toHaveAttribute("aria-hidden", "true");
		await expect(label).toBeHidden();
		await expect(button).toHaveAccessibleName("Copy page");
		expect(await dimensions(button)).toEqual(size);

		expect(
			await confirmation.evaluate((element) =>
				element
					.getAnimations()
					.map((animation) => animation.effect?.getTiming().duration),
			),
		).toEqual(reducedMotion === "reduce" ? [] : [2_000]);
		expect(await readClipboard(page)).toBe(expected.copyText);
		await page.waitForTimeout(1_000);
		await expect(label).toBeHidden();
		await expect(status).toHaveText("Copied to clipboard.");
		await expect(label).toBeVisible({ timeout: 2_500 });
		expect(
			(await page.evaluate(() => performance.now())) - successTime,
		).toBeGreaterThanOrEqual(1_800);
		await expect(confirmation).toBeHidden();
		await expect(status).toBeEmpty();
		await expect(button).toHaveAccessibleName("Copy page");
		expect(await dimensions(button)).toEqual(size);
		if (reducedMotion === "no-preference") {
			await button.click();
			await expect(status).toHaveText("Copied to clipboard.");
			const deadline = await confirmation.evaluate(
				(element) => Number(element.getAnimations()[0]!.startTime) + 2_000,
			);
			await page.waitForTimeout(1_000);
			await button.click();
			expect(await page.evaluate(() => performance.now())).toBeLessThan(
				deadline,
			);
			// Cross the first attempt's deadline while the next confirmation is active.
			await page.waitForTimeout(1_100);
			await expect(label).toBeHidden();
			await expect(status).toHaveText("Copied to clipboard.");
			await expect(label).toBeVisible({ timeout: 2_000 });
			await expect(status).toBeEmpty();
		}
		await expectNarrowDocumentation(page, article);
		const narrowSize = await dimensions(button);
		await button.click();
		await expect(confirmation.locator("svg")).toBeVisible();
		expect(await dimensions(button)).toEqual(narrowSize);
		await expect(label).toBeVisible({ timeout: 3_500 });
		expect(await dimensions(button)).toEqual(narrowSize);
	});
}

test("keeps genuine clipboard denial visible past prior success and permits retry without fallback", async ({
	browser,
	context,
	page,
}) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.goto("/");
	await page.getByRole("tab", { name: "Docs", exact: true }).click();
	const { article, expected } = await openDocumentation(page, "skill");
	const button = copyButton(article);
	const size = await dimensions(button);
	const bodyBefore = await article.locator(".content-markdown").innerHTML();
	const status = article.locator(':scope > [role="status"]');
	await expect(status).toBeEmpty();
	const statusBefore = await status.elementHandle();
	const cdp = await browser.newBrowserCDPSession();
	const pageSession = await context.newCDPSession(page);
	const { targetInfo } = await pageSession.send("Target.getTargetInfo");
	const scope = {
		origin: new URL(page.url()).origin,
		browserContextId: targetInfo.browserContextId,
	};
	const requests: string[] = [];
	const recordRequest = (request: Request) => requests.push(request.url());
	page.on("request", recordRequest);
	await button.click();
	await expect(status).toHaveText("Copied to clipboard.");
	const successTime = await page.evaluate(() => performance.now());
	for (const allowWithoutSanitization of [true, false]) {
		await cdp.send("Browser.setPermission", {
			...scope,
			permission: { name: "clipboard-write", allowWithoutSanitization },
			setting: "denied",
		});
	}
	await activateByKeyboard(page, button);
	const error = article.locator(':scope > [role="alert"]');
	await expect(error).toHaveText("Could not copy to clipboard.");
	expect(
		(await page.evaluate(() => performance.now())) - successTime,
	).toBeLessThan(2_000);
	await expect(error).toBeVisible();
	await expect(error).toHaveCSS("clip-path", "none");
	await expect(status).toBeEmpty();
	expect(await statusBefore?.evaluate((element) => element.isConnected)).toBe(
		true,
	);
	await expect(button.locator(".copy-confirmation")).toBeHidden();
	await expect(button.locator(".copy-label")).toBeVisible();
	await expect(button).toHaveAccessibleName("Copy page");
	expect(await dimensions(button)).toEqual(size);
	await page.waitForTimeout(2_100);
	await expect(error).toHaveText("Could not copy to clipboard.");
	await expect(error).toBeVisible();
	await expect(article.locator("details, textarea")).toHaveCount(0);
	expect(await article.locator(".content-markdown").innerHTML()).toBe(
		bodyBefore,
	);
	await expectNarrowDocumentation(page, article);
	await error.scrollIntoViewIfNeeded();
	await expect(error).toBeInViewport();
	for (const allowWithoutSanitization of [true, false]) {
		await cdp.send("Browser.setPermission", {
			...scope,
			permission: { name: "clipboard-write", allowWithoutSanitization },
			setting: "granted",
		});
	}
	await activateByKeyboard(page, button);
	await expect(error).toHaveCount(0);
	await expect(status).toHaveText("Copied to clipboard.");
	await expect(status).toHaveCSS("clip-path", "inset(50%)");
	await expect(button.locator(".copy-confirmation svg")).toBeVisible();
	expect(await readClipboard(page)).toBe(expected.copyText);
	await expect(button.locator(".copy-label")).toBeVisible({ timeout: 3_500 });
	await expect(status).toBeEmpty();
	expect(requests).toEqual([]);
	page.off("request", recordRequest);
	await pageSession.detach();
	await cdp.detach();
});
