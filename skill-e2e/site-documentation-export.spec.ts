// ABOUTME: Exercises complete documentation discovery, copying, and downloads on the production site.
// ABOUTME: Verifies real clipboard denial recovery, fixed feedback, and inert bundled exports.

import { readFile } from "node:fs/promises";
import { expect, test, type Locator } from "@playwright/test";
import { activateByKeyboard, expectNoHorizontalOverflow } from "./support.ts";

const output = new URL("../apps/site/dist/", import.meta.url);

async function fullTextBytes() {
	return readFile(new URL("llms-full.txt", output));
}

async function dimensions(element: Locator) {
	return element.evaluate((element) => {
		const { width, height } = element.getBoundingClientRect();
		return { width, height };
	});
}

test("discovers the index, crawls every Markdown page, and downloads identical complete bytes", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("link", { name: "docs", exact: true }).click();
	const controls = page.getByRole("region", { name: "Documentation exports" });
	await expect(controls).toContainText(/may exceed.*chat.*limits/i);
	await expect(controls).toContainText(/individual page/i);
	const expected = await fullTextBytes();
	const download = page.waitForEvent("download");
	await controls
		.getByRole("link", { name: "Download all docs", exact: true })
		.click();
	const file = await download;
	expect(file.suggestedFilename()).toBe("llms-full.txt");
	const path = await file.path();
	expect(path).not.toBeNull();
	expect(await readFile(path!)).toEqual(expected);

	await controls
		.getByRole("link", { name: "Documentation index (llms.txt)", exact: true })
		.click();
	await expect(page).toHaveURL(/\/llms\.txt$/);
	const index = await page.locator("body").innerText();
	const indexUrl = page.url();
	const links = [...index.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
	const markdownLinks = links.filter((link) => link[2].endsWith(".md"));
	expect(markdownLinks.some((link) => link[1] === "Skill")).toBe(true);
	const sections: string[] = [];
	for (const [, title, href] of markdownLinks) {
		const url = new URL(href, indexUrl);
		const response = await page.goto(url.href);
		expect(response?.status()).toBe(200);
		expect(response?.headers()["content-type"]).toBe(
			"text/markdown; charset=utf-8",
		);
		const body = await response!.text();
		expect(body.startsWith(`# ${title}\n\n`)).toBe(true);
		sections.push(
			`# ${title}\n\nSource: https://giclang.cc${url.pathname}\n\n${body.slice(`# ${title}\n\n`.length)}`,
		);
	}
	expect(expected.toString("utf8")).toBe(
		`# GiC documentation\n\n${sections.join("\n\n---\n\n")}`,
	);
	const fullLink = links.find((link) => link[2] === "llms-full.txt");
	expect(fullLink).toBeDefined();
	for (const href of ["llms.txt", fullLink![2]]) {
		const response = await page.goto(new URL(href, indexUrl).href);
		expect(response?.status()).toBe(200);
		expect(response?.headers()["content-type"]).toBe(
			"text/plain; charset=utf-8",
		);
		if (href === "llms-full.txt")
			expect(await response!.body()).toEqual(expected);
	}
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
	test(`copies all docs without requests or execution and keeps two-second feedback fixed (${reducedMotion})`, async ({
		context,
		page,
	}) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.emulateMedia({ reducedMotion });
		const workers: string[] = [];
		page.on("worker", (worker) => workers.push(worker.url()));
		await page.goto("/docs/skill/");
		await page.waitForLoadState("networkidle");
		await page.evaluate(() => document.fonts.ready);
		const controls = page.getByRole("region", {
			name: "Documentation exports",
		});
		const button = controls.getByRole("button", {
			name: "Copy all docs",
			exact: true,
		});
		const status = controls.getByRole("status");
		const label = button.locator(".copy-label");
		const confirmation = button.locator(".copy-confirmation");
		const size = await dimensions(button);
		const contentSize = await dimensions(page.getByRole("main"));
		const requests: string[] = [];
		page.on("request", (request) => requests.push(request.url()));
		await activateByKeyboard(page, button);
		await expect(status).toHaveText("Copied to clipboard.");
		await expect(status).toHaveCSS("clip-path", "inset(50%)");
		await expect(confirmation.locator("svg")).toBeVisible();
		await expect(label).toBeHidden();
		await expect(button).toHaveAccessibleName("Copy all docs");
		expect(await dimensions(button)).toEqual(size);
		expect(await dimensions(page.getByRole("main"))).toEqual(contentSize);
		expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
			(await fullTextBytes()).toString("utf8"),
		);
		const timing = await confirmation.evaluate((element) =>
			element.getAnimations().map((animation) => ({
				duration: animation.effect?.getTiming().duration,
				easing: animation.effect?.getTiming().easing,
			})),
		);
		expect(timing).toEqual(
			reducedMotion === "reduce"
				? []
				: [{ duration: 2_000, easing: "steps(3)" }],
		);
		await expect(label).toBeVisible({ timeout: 3_500 });
		await expect(confirmation).toBeHidden();
		await expect(status).toBeEmpty();
		expect(await dimensions(button)).toEqual(size);
		await expect(
			page.getByRole("button", { name: "Copy page", exact: true }),
		).toHaveCount(1);
		await expect(
			page.getByRole("region", { name: "Skill actions" }).getByRole("link"),
		).toHaveCount(2);
		await expect(
			page.locator("canvas, iframe, textarea, input, details"),
		).toHaveCount(0);
		await page.setViewportSize({ width: 375, height: 812 });
		const narrowSize = await dimensions(button);
		await button.click();
		await expect(confirmation.locator("svg")).toBeVisible();
		expect(await dimensions(button)).toEqual(narrowSize);
		await expectNoHorizontalOverflow(page);
		await expect(label).toBeVisible({ timeout: 3_500 });
		expect(requests).toEqual([]);
		expect(workers).toEqual([]);
	});
}

test("clipboard denial remains visible through retries and recovers without fallback UI", async ({
	browser,
	context,
	page,
}) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.goto("/docs/");
	await page.waitForLoadState("networkidle");
	await page.evaluate(() => document.fonts.ready);
	const controls = page.getByRole("region", { name: "Documentation exports" });
	const button = controls.getByRole("button", {
		name: "Copy all docs",
		exact: true,
	});
	const size = await dimensions(button);
	const counts = await page
		.locator("pre, code, details, textarea, input")
		.count();
	const requests: string[] = [];
	page.on("request", (request) => requests.push(request.url()));
	await button.click();
	await expect(controls.getByRole("status")).toHaveText("Copied to clipboard.");
	const cdp = await browser.newBrowserCDPSession();
	const pageSession = await context.newCDPSession(page);
	try {
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
				await expect(controls.getByRole("alert")).toHaveText(
					"Could not copy to clipboard.",
				);
				await expect(controls.getByRole("alert")).toBeVisible();
				await expect(button.locator(".copy-confirmation")).toBeHidden();
				await expect(button.locator(".copy-label")).toBeVisible();
				await expect(controls.getByRole("status")).toHaveCount(0);
				await page.waitForTimeout(2_100);
				await expect(controls.getByRole("alert")).toBeVisible();
				await activateByKeyboard(page, button);
				await expect(controls.getByRole("alert")).toHaveText(
					"Could not copy to clipboard.",
				);
			} else {
				await expect(controls.getByRole("alert")).toHaveCount(0);
				await expect(controls.getByRole("status")).toHaveText(
					"Copied to clipboard.",
				);
				expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
					(await fullTextBytes()).toString("utf8"),
				);
				await expect(button.locator(".copy-label")).toBeVisible({
					timeout: 3_500,
				});
				await expect(controls.getByRole("status")).toBeEmpty();
			}
			expect(await dimensions(button)).toEqual(size);
			await expect(button).toBeEnabled();
			expect(
				await page.locator("pre, code, details, textarea, input").count(),
			).toBe(counts);
			await expect(page.locator("textarea, input, details")).toHaveCount(0);
		}
		expect(requests).toEqual([]);
	} finally {
		await pageSession.detach();
		await cdp.detach();
	}
});
