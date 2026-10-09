// ABOUTME: Exercises complete website documentation copying with the real Chromium clipboard.
// ABOUTME: Verifies portable exports, transient feedback, denial recovery, and retained Skill links.

import { expect, test, type Locator } from "@playwright/test";
import {
	listContentFiles,
	readGicAgentSkill,
} from "../packages/content/src/content-files.ts";
import { activateByKeyboard, expectNoHorizontalOverflow } from "./support.ts";

function authoredBody(source: string): string {
	return source.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "");
}

async function canonicalDocuments() {
	const files = await listContentFiles("docs");
	const skill = await readGicAgentSkill();
	return files.flatMap((file) => {
		if (file.kind !== "markdown") return [];
		const title = file.frontmatter.title;
		if (typeof title !== "string")
			throw new Error(`Missing title: ${file.path}`);
		const id = file.path.slice("docs/".length, -".md".length);
		const body =
			id === "skill"
				? [
						authoredBody(file.source),
						"## GiC agent skill",
						authoredBody(skill.skillSource),
						"## Language reference",
						skill.referenceSource,
					].join("\n\n")
				: authoredBody(file.source);
		const portable = body
			.replaceAll(
				"(./colors-named.md)",
				"(https://giclang.cc/docs/colors-named.md)",
			)
			.replace(
				/\(\.\/images\/drawing\/([^)]*)\)/g,
				"(https://giclang.cc/docs-assets/docs/images/drawing/$1)",
			);
		return [
			{ id, title: title.trim(), copyText: `# ${title.trim()}\n\n${portable}` },
		];
	});
}

async function dimensions(element: Locator) {
	return element.evaluate((element) => {
		const { width, height } = element.getBoundingClientRect();
		return { width, height };
	});
}

const documents = await canonicalDocuments();

for (const document of documents) {
	test(`copies and directly serves the complete ${document.title} Markdown`, async ({
		context,
		page,
	}) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.goto(`/docs/${document.id}/`);
		await page.waitForLoadState("networkidle");
		await expect(
			page
				.getByRole("main")
				.getByRole("heading", { level: 1, name: document.title, exact: true }),
		).toHaveText(document.title);
		const button = page.getByRole("button", { name: "Copy page", exact: true });
		await expect(button).toHaveCount(1);
		await expect(page.getByRole("textbox")).toHaveCount(0);
		await expect(page.locator("textarea, input, details")).toHaveCount(0);
		if (document.id === "skill") {
			const actions = page.getByRole("region", { name: "Skill actions" });
			await expect(actions.getByRole("link")).toHaveCount(2);
			await expect(
				actions.getByRole("link", {
					name: "Download skill (ZIP)",
					exact: true,
				}),
			).toHaveAttribute("href", "/skills/gic-agent.zip");
			await expect(
				actions.getByRole("link", { name: "View raw skill", exact: true }),
			).toHaveAttribute("href", "/skills/gic-agent.txt");
			await expect(actions.getByRole("button")).toHaveCount(0);
		}
		const requests: string[] = [];
		const record = (request: { url(): string }) => requests.push(request.url());
		page.on("request", record);
		await activateByKeyboard(page, button);
		await expect(page.getByRole("status")).toHaveText("Copied to clipboard.");
		expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
			document.copyText,
		);
		expect(requests).toEqual([]);
		page.off("request", record);
		await page.setViewportSize({ width: 375, height: 812 });
		await expectNoHorizontalOverflow(page);
		const response = await page.goto(`/docs/${document.id}.md`);
		expect(response?.status()).toBe(200);
		expect(response?.headers()["content-type"]).toBe(
			"text/markdown; charset=utf-8",
		);
		expect(await response?.body()).toEqual(
			Buffer.from(document.copyText, "utf8"),
		);
		expect(await response?.text()).toBe(document.copyText);
		expect(await page.locator("body").textContent()).toBe(document.copyText);
		await expect(
			page.getByRole("button", { name: "Copy page", exact: true }),
		).toHaveCount(0);
	});
}

for (const reducedMotion of ["no-preference", "reduce"] as const) {
	test(`shows a fixed-size two-second Copy page confirmation (${reducedMotion})`, async ({
		context,
		page,
	}) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.emulateMedia({ reducedMotion });
		await page.goto("/docs/drawing/");
		await page.waitForLoadState("networkidle");
		await page.evaluate(() => document.fonts.ready);
		const button = page.getByRole("button", { name: "Copy page", exact: true });
		const label = button.locator(".copy-label");
		const confirmation = button.locator(".copy-confirmation");
		const main = page.getByRole("main");
		const size = await dimensions(button);
		const mainSize = await dimensions(main);
		await activateByKeyboard(page, button);
		await expect(confirmation.locator("svg")).toBeVisible();
		await expect(label).toBeHidden();
		await expect(button).toHaveAccessibleName("Copy page");
		await expect(page.getByRole("status")).toHaveCSS("clip-path", "inset(50%)");
		expect(await dimensions(button)).toEqual(size);
		expect(await dimensions(main)).toEqual(mainSize);
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
		await expect(page.getByRole("status")).toBeEmpty();
		expect(await dimensions(button)).toEqual(size);
		await page.setViewportSize({ width: 375, height: 812 });
		const narrowSize = await dimensions(button);
		await button.click();
		await expect(confirmation.locator("svg")).toBeVisible();
		expect(await dimensions(button)).toEqual(narrowSize);
		const table = main
			.getByRole("region", { name: "Scrollable table" })
			.first();
		await expect(table).toHaveCSS("overflow-x", "auto");
		await table.focus();
		await page.keyboard.press("ArrowRight");
		await expect
			.poll(() => table.evaluate((element) => element.scrollLeft))
			.toBeGreaterThan(0);
		await expectNoHorizontalOverflow(page);
	});
}

test("restarts documentation confirmation before its previous expiry", async ({
	context,
	page,
}) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.goto("/docs/colors/");
	const button = page.getByRole("button", { name: "Copy page", exact: true });
	const confirmation = button.locator(".copy-confirmation");
	await button.click();
	await expect
		.poll(() =>
			confirmation.evaluate((element) =>
				Number(element.getAnimations()[0]?.currentTime ?? 0),
			),
		)
		.toBeGreaterThan(1_000);
	await button.click();
	await expect(confirmation.locator("svg")).toBeVisible();
	// Cross the previous deadline while the repeated confirmation is active.
	await page.waitForTimeout(1_100);
	await expect(button.locator(".copy-label")).toBeHidden();
	await expect(page.getByRole("status")).toHaveText("Copied to clipboard.");
	await expect(button.locator(".copy-label")).toBeVisible({ timeout: 2_000 });
	await expect(page.getByRole("status")).toBeEmpty();
});

test("clipboard denial stays visible through repeats and recovers without fallback UI or requests", async ({
	browser,
	context,
	page,
}) => {
	const expected = documents.find((document) => document.id === "skill");
	expect(expected).toBeDefined();
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.goto("/docs/skill/");
	await page.waitForLoadState("networkidle");
	await page.evaluate(() => document.fonts.ready);
	const button = page.getByRole("button", { name: "Copy page", exact: true });
	const size = await dimensions(button);
	const counts = await page
		.locator("pre, code, details, textarea, input")
		.count();
	const requests: string[] = [];
	page.on("request", (request) => requests.push(request.url()));
	await button.click();
	await expect(page.getByRole("status")).toHaveText("Copied to clipboard.");
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
				await expect(page.getByRole("alert")).toHaveText(
					"Could not copy to clipboard.",
				);
				await expect(page.getByRole("alert")).toBeVisible();
				await expect(button.locator(".copy-confirmation")).toBeHidden();
				await expect(button.locator(".copy-label")).toBeVisible();
				await expect(page.getByRole("status")).toHaveCount(0);
				await page.waitForTimeout(2_100);
				await expect(page.getByRole("alert")).toHaveText(
					"Could not copy to clipboard.",
				);
				await activateByKeyboard(page, button);
				await expect(page.getByRole("alert")).toBeVisible();
				await expect(page.getByRole("alert")).toHaveText(
					"Could not copy to clipboard.",
				);
			} else {
				await expect(page.getByRole("alert")).toHaveCount(0);
				await expect(page.getByRole("status")).toHaveText(
					"Copied to clipboard.",
				);
				await expect(button.locator(".copy-confirmation svg")).toBeVisible();
				expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
					expected?.copyText,
				);
				await expect(button.locator(".copy-label")).toBeVisible({
					timeout: 3_500,
				});
				await expect(page.getByRole("status")).toBeEmpty();
			}
			expect(await dimensions(button)).toEqual(size);
			await expect(button).toBeEnabled();
			await expect(button).toHaveAccessibleName("Copy page");
			expect(
				await page.locator("pre, code, details, textarea, input").count(),
			).toBe(counts);
			await expect(page.getByRole("textbox")).toHaveCount(0);
			await expect(page.locator("textarea, input, details")).toHaveCount(0);
		}
		expect(requests).toEqual([]);
	} finally {
		await pageSession.detach();
		await cdp.detach();
	}
});
