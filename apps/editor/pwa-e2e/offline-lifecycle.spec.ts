// ABOUTME: Verifies the production application restarts offline with its authoring workflows.
// ABOUTME: Exercises cached Monaco, core, content, recovery, file operations, and exports.

import {
	expect,
	test,
	type BrowserContext,
	type Page,
	type Request,
} from "@playwright/test";
import { fileURLToPath } from "node:url";
import {
	followBundledDocumentationLink,
	moveDocumentationBesideEditor,
	showBothWorkspaces,
} from "../../../e2e/documentation-layout.ts";
import { readBundledDocumentation } from "../../../e2e/documentation-copy.ts";
import { setEditorSource } from "../../../e2e/editor.ts";
import { readBundledExample } from "../../../e2e/example-copy.ts";
import {
	readCanonicalSkillExport,
	expectDownloadedSkillArchive,
} from "../../../e2e/skill-export.ts";

const repeatExamplePath = fileURLToPath(
	new URL(
		"../../../packages/content/content/examples/repeat/repeat.gic",
		import.meta.url,
	),
);

async function waitForServiceWorker(page: Page) {
	await expect
		.poll(
			() =>
				page.evaluate(async () => {
					const registration = await navigator.serviceWorker.getRegistration();
					return registration?.active?.state;
				}),
			{ timeout: 10_000 },
		)
		.toBe("activated");
}

async function restartOffline(context: BrowserContext, page: Page) {
	await fetch("http://127.0.0.1:4173/__pwa_test_offline", {
		method: "POST",
	});
	await page.close();
	const offlinePage = await context.newPage();
	await offlinePage.goto("/");
	return offlinePage;
}

async function chooseFileCommand(page: Page, name: string) {
	await page.getByRole("menuitem", { name: "File", exact: true }).click();
	await page
		.getByRole("menu", { name: "File" })
		.getByRole("menuitem", { name, exact: true })
		.click();
}

test("serves the Markdown export instead of the shell on a controlled online navigation", async ({
	page,
}) => {
	test.setTimeout(60_000);
	const expected = await readBundledDocumentation("drawing");
	await fetch("http://127.0.0.1:4173/__pwa_test_online", { method: "POST" });
	await page.goto("/");
	await waitForServiceWorker(page);
	await page.reload();
	await expect
		.poll(
			() => page.evaluate(() => navigator.serviceWorker.controller?.state),
			{ timeout: 10_000 },
		)
		.toBe("activated");

	for (const path of ["/docs/drawing.md", "/docs/drawing.md?download=1"]) {
		const response = await page.goto(path);
		if (response === null)
			throw new Error("Markdown navigation returned no response.");
		expect(response.status()).toBe(200);
		expect
			.soft(response.headers()["content-type"])
			.toBe("text/markdown; charset=utf-8");
		expect.soft(await response.text()).toBe(expected.copyText);
		await expect(page.locator("#app")).toHaveCount(0);
	}
});

test("restarts offline with the complete tutor-less authoring workflow", async ({
	context,
	page,
}) => {
	test.setTimeout(60_000);
	await fetch("http://127.0.0.1:4173/__pwa_test_online", { method: "POST" });
	await page.goto("/");
	await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 15_000 });
	await waitForServiceWorker(page);
	await setEditorSource(page, 'circle(50, 50, 20);\nprint("recover me");');
	await expect
		.poll(() => page.evaluate(() => localStorage.getItem("gic.recovery.v1")))
		.not.toBeNull();

	const offlinePage = await restartOffline(context, page);
	await expect(
		offlinePage.getByRole("tab", { name: "Description" }),
	).toHaveCount(0);
	await expect(
		offlinePage.getByRole("textbox", { name: "Markdown" }),
	).toHaveCount(0);
	const recovery = offlinePage.getByRole("alertdialog", {
		name: "Recover unsaved sketch?",
	});
	await expect(recovery).toBeVisible();
	await recovery.getByRole("button", { name: "Restore" }).click();
	await expect(offlinePage.locator(".monaco-editor")).toBeVisible({
		timeout: 15_000,
	});
	await expect(offlinePage.locator(".view-line")).toHaveText([
		"circle(50, 50, 20);",
		'print("recover me");',
	]);
	await expect(offlinePage.locator("#output")).toHaveText("Line 2: recover me");

	await setEditorSource(offlinePage, "cir");
	await offlinePage.keyboard.press("Control+Space");
	await expect(
		offlinePage
			.locator(".suggest-widget")
			.getByText("circle", { exact: true })
			.first(),
	).toBeVisible();
	await offlinePage.keyboard.press("Escape");

	const source =
		'background("white");\nfill("black");\ncircle(50, 50, 20);\nprint("offline");';
	await setEditorSource(offlinePage, source);
	await expect(offlinePage.locator("#output")).toHaveText("Line 4: offline");
	await expect(
		offlinePage.getByRole("button", { name: "Download PNG" }),
	).toBeEnabled();
	await expect(
		offlinePage.getByRole("button", { name: "Download standalone HTML" }),
	).toBeEnabled();

	await offlinePage.getByRole("tab", { name: "Examples" }).click();
	await expect(
		offlinePage
			.getByRole("tabpanel", { name: "Examples" })
			.getByRole("listitem")
			.first(),
	).toBeVisible();
	await offlinePage.getByRole("tab", { name: "Gestalten" }).click();

	await setEditorSource(offlinePage, "circle(50, 50);");
	await expect(offlinePage.locator("#problems")).toContainText(
		"expects 3 arguments",
	);
	await setEditorSource(offlinePage, source);
	await expect(offlinePage.locator("#problems")).toHaveText("");

	await expect(
		offlinePage.getByRole("button", { name: "Download PNG" }),
	).toBeEnabled();
	const pngDownload = offlinePage.waitForEvent("download");
	await offlinePage.getByRole("button", { name: "Download PNG" }).click();
	expect((await pngDownload).suggestedFilename()).toBe("gic-sketch.png");

	const htmlDownload = offlinePage.waitForEvent("download");
	await offlinePage
		.getByRole("button", { name: "Download standalone HTML" })
		.click();
	expect((await htmlDownload).suggestedFilename()).toBe("gic-sketch.html");

	await chooseFileCommand(offlinePage, "Open");
	await offlinePage.locator("#open-file").setInputFiles(repeatExamplePath);
	await offlinePage
		.getByRole("alertdialog", { name: "Discard changes?" })
		.getByRole("button", { name: "Discard changes" })
		.click();
	await expect(
		offlinePage.getByRole("tab", { name: "repeat.gic", exact: true }),
	).toBeVisible();

	await setEditorSource(offlinePage, "point(10, 10);");
	const sketchDownload = offlinePage.waitForEvent("download");
	await chooseFileCommand(offlinePage, "Save");
	expect((await sketchDownload).suggestedFilename()).toBe("repeat.gic");
});

test("reopens a moved documentation page from a relative link offline", async ({
	context,
	page,
}) => {
	test.setTimeout(60_000);
	await fetch("http://127.0.0.1:4173/__pwa_test_online", { method: "POST" });
	await page.setViewportSize({ width: 1600, height: 900 });
	await page.goto("/");
	await waitForServiceWorker(page);
	const docs = await showBothWorkspaces(page);
	const { sourceName, targetName } = await followBundledDocumentationLink(page);
	await moveDocumentationBesideEditor(page, targetName);
	await expect(
		docs.getByRole("tab", { name: targetName, exact: true }),
	).toHaveCount(0);

	const offlinePage = await restartOffline(context, page);
	const offlineDocs = offlinePage.getByRole("tabpanel", { name: "Docs" });
	await offlineDocs.getByRole("tab", { name: sourceName, exact: true }).click();
	await offlineDocs
		.getByRole("article", { name: sourceName })
		.locator('a[href$=".md"]')
		.first()
		.click();
	await expect(
		offlinePage.getByRole("tab", { name: targetName, exact: true }),
	).toHaveAttribute("aria-selected", "true");
	await expect(
		offlinePage.getByRole("article", { name: targetName }),
	).toBeVisible();
});

test("downloads the canonical Skill after an offline restart", async ({
	context,
	page,
}) => {
	test.setTimeout(60_000);
	const expected = await readCanonicalSkillExport();
	await fetch("http://127.0.0.1:4173/__pwa_test_online", { method: "POST" });
	await page.goto("/");
	await waitForServiceWorker(page);
	const offlinePage = await restartOffline(context, page);
	await expect(offlinePage.locator(".monaco-editor")).toBeVisible();
	const sourceBefore = await offlinePage
		.locator(".view-line")
		.allTextContents();
	await offlinePage.getByRole("tab", { name: "Docs", exact: true }).click();
	await offlinePage
		.getByRole("tabpanel", { name: "Docs" })
		.getByRole("tab", { name: "Skill", exact: true })
		.click();
	const article = offlinePage.getByRole("article", { name: "Skill" });
	const requests: string[] = [];
	offlinePage.on("request", (request) => requests.push(request.url()));
	const actions = article.getByRole("region", { name: "Skill actions" });
	await expect(actions.getByRole("link")).toHaveCount(2);
	await expect(
		actions.getByRole("link", { name: "View raw skill", exact: true }),
	).toHaveAttribute("href", "https://giclang.cc/skills/gic-agent.txt");
	await expect(actions.locator("button, details, textarea")).toHaveCount(0);
	const download = offlinePage.waitForEvent("download");
	await article
		.getByRole("link", { name: "Download skill (ZIP)", exact: true })
		.click();
	await expectDownloadedSkillArchive(await download, expected);
	expect(requests).toEqual([]);
	await offlinePage
		.getByRole("tab", { name: "Gestalten", exact: true })
		.click();
	expect(await offlinePage.locator(".view-line").allTextContents()).toEqual(
		sourceBefore,
	);
});

test("copies bundled examples after an offline restart without fallback UI", async ({
	context,
	page,
	browserName,
}) => {
	test.setTimeout(60_000);
	const expected = await readBundledExample();
	if (browserName === "chromium")
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	await fetch("http://127.0.0.1:4173/__pwa_test_online", { method: "POST" });
	await page.goto("/");
	await waitForServiceWorker(page);
	const offlinePage = await restartOffline(context, page);
	await expect(offlinePage.locator(".monaco-editor")).toBeVisible();
	const sourceBefore = await offlinePage
		.locator(".view-line")
		.allTextContents();
	const recoveryBefore = await offlinePage.evaluate(() =>
		localStorage.getItem("gic.recovery.v1"),
	);
	await offlinePage.getByRole("tab", { name: "Examples", exact: true }).click();
	const card = offlinePage.locator(".content-card").filter({
		has: offlinePage.getByRole("heading", {
			name: expected.title,
			exact: true,
		}),
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
	const buttonSize = await button.evaluate((element) => {
		const { width, height } = getComputedStyle(element);
		return { width, height };
	});
	const requests: string[] = [];
	offlinePage.on("request", (request) => requests.push(request.url()));
	await button.click();
	await expect(
		card.locator('[role="status"], [role="alert"]').filter({ hasText: /\S/ }),
	).toHaveText(/^(Copied to clipboard\.|Could not copy to clipboard\.)$/);
	if (browserName === "chromium") {
		await expect(card.getByRole("status")).toHaveText("Copied to clipboard.");
		await expect(card.getByRole("status")).toHaveCSS("clip-path", "inset(50%)");
		await expect(checkmark).toBeVisible();
		await expect(label).toBeHidden();
		await expect(button).toHaveCSS("width", buttonSize.width);
		await expect(button).toHaveCSS("height", buttonSize.height);
		expect(
			await offlinePage.evaluate(() => navigator.clipboard.readText()),
		).toBe(expected.copyText);
		await offlinePage.waitForTimeout(2_100);
		await expect(checkmark).toBeHidden();
		await expect(label).toBeVisible();
		await expect(card.getByRole("status")).toBeEmpty();
		await expect(button).toHaveAttribute("aria-label", "Copy to clipboard");
		await expect(button).toHaveCSS("width", buttonSize.width);
		await expect(button).toHaveCSS("height", buttonSize.height);
	}
	await expect(card.locator("pre, code, details, textarea")).toHaveCount(0);
	expect(requests).toEqual([]);
	await offlinePage
		.getByRole("tab", { name: "Gestalten", exact: true })
		.click();
	expect(await offlinePage.locator(".view-line").allTextContents()).toEqual(
		sourceBefore,
	);
	expect(
		await offlinePage.evaluate(() => localStorage.getItem("gic.recovery.v1")),
	).toBe(recoveryBefore);
	await expect(offlinePage.getByRole("alertdialog")).toHaveCount(0);
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
	test(`copies complete documentation after an offline restart (${reducedMotion})`, async ({
		context,
		page,
		browserName,
	}) => {
		test.setTimeout(60_000);
		if (browserName === "chromium")
			await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.emulateMedia({ reducedMotion });
		await fetch("http://127.0.0.1:4173/__pwa_test_online", { method: "POST" });
		await page.goto("/");
		await waitForServiceWorker(page);
		await setEditorSource(page, 'point(23, 41);\nprint("keep my sketch");');
		await expect
			.poll(() => page.evaluate(() => localStorage.getItem("gic.recovery.v1")))
			.not.toBeNull();
		const offlinePage = await restartOffline(context, page);
		await offlinePage.emulateMedia({ reducedMotion });
		await offlinePage
			.getByRole("alertdialog", { name: "Recover unsaved sketch?" })
			.getByRole("button", { name: "Restore", exact: true })
			.click();
		await expect(offlinePage.locator(".view-line")).toHaveText([
			"point(23, 41);",
			'print("keep my sketch");',
		]);
		await expect(offlinePage.locator("#output")).toHaveText(
			"Line 2: keep my sketch",
		);
		const sourceBefore = await offlinePage
			.locator(".view-line")
			.allTextContents();
		const recoveryBefore = await offlinePage.evaluate(() =>
			localStorage.getItem("gic.recovery.v1"),
		);
		await offlinePage.getByRole("tab", { name: "Docs", exact: true }).click();
		const docs = offlinePage.getByRole("tabpanel", {
			name: "Docs",
			exact: true,
		});

		for (const id of ["skill", "drawing", "colors", "functions"]) {
			const expected = await readBundledDocumentation(id);
			await docs
				.getByRole("tab", { name: expected.title, exact: true })
				.click();
			const article = docs.getByRole("article", {
				name: expected.title,
				exact: true,
			});
			await expect(article).toBeVisible();
			await expect(article).toHaveAttribute("data-document-id", id);
			if (id === "skill") {
				const actions = article.getByRole("region", { name: "Skill actions" });
				expect(await actions.getByRole("link").allTextContents()).toEqual([
					"Download skill (ZIP)",
					"View raw skill",
				]);
				await expect(
					actions.getByRole("link", {
						name: "Download skill (ZIP)",
						exact: true,
					}),
				).toHaveAttribute("download", "gic-agent.zip");
				await expect(
					actions.getByRole("link", { name: "View raw skill", exact: true }),
				).toHaveAttribute("href", "https://giclang.cc/skills/gic-agent.txt");
				await expect(actions.locator("button, details, textarea")).toHaveCount(
					0,
				);
			}
			const button = article.getByRole("button", {
				name: "Copy page",
				exact: true,
			});
			await expect(article.getByRole("button")).toHaveCount(1);
			const label = button.locator(".copy-label");
			const confirmation = button.locator(".copy-confirmation");
			const status = article.getByRole("status");
			await expect(label).toBeVisible();
			await expect(confirmation).toBeHidden();
			await expect(status).toBeEmpty();
			const buttonSize = await button.evaluate((element) => {
				const { width, height } = getComputedStyle(element);
				return { width, height };
			});
			const bodyBefore = await article.locator(".content-markdown").innerHTML();
			const requests: string[] = [];
			const recordRequest = (request: Request) => requests.push(request.url());
			offlinePage.on("request", recordRequest);
			await button.click();
			await expect(
				article
					.locator('[role="status"], [role="alert"]')
					.filter({ hasText: /\S/ }),
			).toHaveText(/^(Copied to clipboard\.|Could not copy to clipboard\.)$/);
			if (
				browserName === "chromium" ||
				(await status.textContent()) === "Copied to clipboard."
			) {
				await expect(status).toHaveText("Copied to clipboard.");
				await expect(status).toHaveCSS("clip-path", "inset(50%)");
				await expect(article.getByRole("alert")).toHaveCount(0);
				await expect(confirmation.locator("svg")).toBeVisible();
				await expect(confirmation).toHaveAttribute("aria-hidden", "true");
				await expect(label).toBeHidden();
				expect(
					await confirmation.evaluate((element) =>
						element
							.getAnimations()
							.map((animation) => animation.effect?.getTiming().duration),
					),
				).toEqual(reducedMotion === "reduce" ? [] : [2_000]);
				if (browserName === "chromium") {
					const copied = await offlinePage.evaluate(() =>
						navigator.clipboard.readText(),
					);
					expect(copied).toBe(expected.copyText);
					if (id === "skill") {
						expect(copied).toContain("## Use a skill");
						expect(copied).toContain("## GiC agent skill");
						expect(copied).toContain("## Language reference");
					}
					if (id === "drawing")
						expect(copied).toContain(
							"https://giclang.cc/docs-assets/docs/images/drawing/",
						);
					if (id === "colors")
						expect(copied).toContain(
							"(https://giclang.cc/docs/colors-named.md)",
						);
				}
				await expect(button).toHaveCSS("width", buttonSize.width);
				await expect(button).toHaveCSS("height", buttonSize.height);
				await offlinePage.waitForTimeout(1_000);
				await expect(label).toBeHidden();
				await expect(status).toHaveText("Copied to clipboard.");
				await expect(label).toBeVisible({ timeout: 2_500 });
				await expect(confirmation).toBeHidden();
				await expect(status).toBeEmpty();
			} else {
				const error = article.getByRole("alert");
				await expect(error).toHaveText("Could not copy to clipboard.");
				await expect(error).toBeVisible();
				await expect(error).toHaveCSS("clip-path", "none");
				await expect(status).toBeEmpty();
				await expect(confirmation).toBeHidden();
				await expect(label).toBeVisible();
				await offlinePage.waitForTimeout(2_100);
				await expect(error).toBeVisible();
				await expect(error).toHaveText("Could not copy to clipboard.");
			}
			await expect(button).toHaveAccessibleName("Copy page");
			await expect(button).toHaveCSS("width", buttonSize.width);
			await expect(button).toHaveCSS("height", buttonSize.height);
			await expect(article.locator("details, textarea")).toHaveCount(0);
			expect(await article.locator(".content-markdown").innerHTML()).toBe(
				bodyBefore,
			);
			expect(requests).toEqual([]);
			offlinePage.off("request", recordRequest);
		}
		await expect(offlinePage).toHaveURL("/");
		await offlinePage
			.getByRole("tab", { name: "Gestalten", exact: true })
			.click();
		await expect
			.poll(() => offlinePage.locator(".view-line").allTextContents())
			.toEqual(sourceBefore);
		expect(
			await offlinePage.evaluate(() => localStorage.getItem("gic.recovery.v1")),
		).toBe(recoveryBefore);
		await expect(offlinePage.getByRole("alertdialog")).toHaveCount(0);
	});
}

test.afterEach(async () => {
	await fetch("http://127.0.0.1:4173/__pwa_test_online", { method: "POST" });
});
