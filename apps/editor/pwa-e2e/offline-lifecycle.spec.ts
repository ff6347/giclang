// ABOUTME: Verifies the production application restarts offline with its authoring workflows.
// ABOUTME: Exercises cached Monaco, core, content, recovery, file operations, and exports.

import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import {
	followBundledDocumentationLink,
	moveDocumentationBesideEditor,
	showBothWorkspaces,
} from "../../../e2e/documentation-layout.ts";
import { setEditorSource } from "../../../e2e/editor.ts";
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

test.afterEach(async () => {
	await fetch("http://127.0.0.1:4173/__pwa_test_online", { method: "POST" });
});
