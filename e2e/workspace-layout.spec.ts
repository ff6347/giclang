// ABOUTME: Verifies the persistent, keyboard-operable browser IDE workspace.
// ABOUTME: Covers panel visibility, status tabs, error reopening, and reset behavior.

import { expect, test } from "@playwright/test";
import { setEditorSource } from "./editor.ts";

test("shows the top-level application tabs and Code workspace", async ({
	page,
}) => {
	await page.goto("/");

	await expect(page.getByRole("heading", { name: "GiC" })).toHaveCount(0);
	await expect(
		page.getByRole("navigation", { name: "Workspace controls" }),
	).toHaveCount(0);
	for (const name of ["Code", "Settings", "Examples", "Docs", "About"]) {
		await expect(page.getByRole("tab", { name })).toBeVisible();
	}
	await expect(page.getByRole("tab", { name: "Code" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	await expect(page.getByRole("tabpanel", { name: "Code" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Editor" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Preview" })).toBeVisible();
	for (const name of ["Editor", "Preview", "Tutor"]) {
		await expect(page.getByRole("tab", { name })).toHaveCount(0);
	}
	await expect(page.getByRole("tab", { name: "Problems" })).toBeVisible();
	await expect(page.getByRole("tab", { name: "Output" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Tutor" })).toContainText(
		"Tutor unavailable",
	);
	await expect(
		page.getByRole("button", { name: "Retry tutor setup" }),
	).toBeVisible();
	await expect(page.getByRole("button", { name: "Hide tutor" })).toHaveCount(0);
	await page.getByRole("button", { name: "Retry tutor setup" }).click();
	await expect(page.getByRole("region", { name: "Tutor" })).toContainText(
		"Tutor is still unavailable.",
	);
});

test("places Problems and Output beneath Preview in the middle column", async ({
	page,
}) => {
	await page.goto("/");

	const editorBox = await page
		.getByRole("region", { name: "Editor" })
		.boundingBox();
	const previewBox = await page
		.getByRole("region", { name: "Preview" })
		.boundingBox();
	const problemsBox = await page
		.getByRole("region", { name: "Problems" })
		.boundingBox();
	const tutorBox = await page
		.getByRole("region", { name: "Tutor" })
		.boundingBox();

	expect(editorBox).not.toBeNull();
	expect(previewBox).not.toBeNull();
	expect(problemsBox).not.toBeNull();
	expect(tutorBox).not.toBeNull();
	expect(problemsBox!.y).toBeGreaterThanOrEqual(
		previewBox!.y + previewBox!.height,
	);
	expect(problemsBox!.x).toBeCloseTo(previewBox!.x, 0);
	expect(problemsBox!.width).toBeCloseTo(previewBox!.width, 0);
	expect(editorBox!.x).toBeLessThan(previewBox!.x);
	expect(tutorBox!.x).toBeGreaterThan(previewBox!.x + previewBox!.width);
});

test("places application preferences and provider guidance in Settings", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Settings" }).click();

	await expect(page.getByRole("region", { name: "Settings" })).toBeVisible();
	await expect(page.getByRole("tabpanel", { name: "Code" })).toBeHidden();
	await expect(
		page.getByRole("checkbox", { name: "Format on save" }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Reset Layout" }),
	).toBeVisible();
	await expect(page.getByRole("region", { name: "Settings" })).toContainText(
		"Tutor provider",
	);
	await expect(page.getByRole("region", { name: "Settings" })).toContainText(
		"Tutor provider configuration is available in the desktop application",
	);
});

test("shows explicit placeholders for Examples, Docs, and About", async ({
	page,
}) => {
	await page.goto("/");
	const placeholders = [
		{ name: "Examples", text: "one-document workflow" },
		{ name: "Docs", text: "Language reference and help" },
		{ name: "About", text: "Gestalten in Code" },
	];

	for (const { name, text } of placeholders) {
		await page.getByRole("tab", { name }).click();
		await expect(page.getByRole("tabpanel", { name })).toContainText(text);
	}
});

test("recovers from invalid persisted layout state", async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			"gic.workspaceLayout",
			JSON.stringify({
				version: 4,
				layout: {
					global: {},
					borders: [],
					layout: {
						type: "row",
						children: [
							{
								type: "tabset",
								children: [
									{
										type: "tab",
										id: "unrelated",
										name: "Unrelated",
										component: "unrelated",
									},
								],
							},
						],
					},
				},
			}),
		);
	});
	await page.goto("/");

	await expect(page.getByRole("region", { name: "Editor" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Preview" })).toBeVisible();
	await expect(page.getByRole("tab", { name: "Problems" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
});

test("persists keyboard resizing and the selected status tab", async ({
	page,
}) => {
	await page.goto("/");

	const editor = page.getByRole("region", { name: "Editor" });
	const initialWidth = (await editor.boundingBox())?.width;
	expect(initialWidth).toBeDefined();

	const verticalSplitter = page
		.locator("[role='separator'][aria-orientation='vertical']")
		.first();
	await verticalSplitter.focus();
	await verticalSplitter.press("ArrowRight");
	const resizedWidth = (await editor.boundingBox())?.width;
	expect(resizedWidth).toBeGreaterThan(initialWidth!);

	await page.getByRole("tab", { name: "Output" }).click();

	await page.reload();

	await expect(page.getByRole("tab", { name: "Output" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	expect((await editor.boundingBox())?.width).toBeCloseTo(resizedWidth!, 0);
});

test("preserves Output selection on errors when the lower panel is visible", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Output" }).click();

	await setEditorSource(
		page,
		`print("first");
print("second");
let size = "large";
if (size > 20) {
	circle(50, 50, size);
}`,
	);

	await expect(page.getByRole("tab", { name: "Output (2)" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	await expect(page.locator("#output").locator("p")).toHaveText([
		"Line 1: first",
		"Line 2: second",
	]);
	await expect(page.getByRole("tab", { name: "Problems (1)" })).toBeVisible();
});

test("Reset Layout restores workspace geometry and the default status tab", async ({
	page,
}) => {
	await page.goto("/");
	await setEditorSource(page, "circle(50, 50, 30);");
	await page.getByRole("tab", { name: "Output" }).click();
	const splitter = page
		.locator("[role='separator'][aria-orientation='vertical']")
		.first();
	await splitter.focus();
	await splitter.press("ArrowRight");

	await page.getByRole("tab", { name: "Settings" }).click();
	await page.getByRole("button", { name: "Reset Layout" }).click();
	await page.getByRole("tab", { name: "Code" }).click();

	await expect(page.getByRole("region", { name: "Editor" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Preview" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Tutor" })).toBeVisible();
	await expect(page.getByRole("tab", { name: "Problems" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	await expect(page.locator(".view-line")).toHaveText("circle(50, 50, 30);");
});
