// ABOUTME: Verifies the persistent, keyboard-operable browser IDE workspace.
// ABOUTME: Covers panel visibility, status tabs, error reopening, and reset behavior.

import { expect, test } from "@playwright/test";
import { setEditorSource } from "./editor.ts";

test("shows the top-level application tabs and Code workspace", async ({
	page,
}) => {
	await page.goto("/");

	const applicationTabs = page.getByRole("tablist", { name: "Application" });
	await expect(page.getByRole("heading", { name: "GiC" })).toHaveCount(0);
	await expect(
		page.getByRole("navigation", { name: "Workspace controls" }),
	).toHaveCount(0);
	for (const name of ["Code", "Settings", "Examples", "Docs", "About"]) {
		await expect(applicationTabs.getByRole("tab", { name })).toBeVisible();
	}
	await expect(
		applicationTabs.getByRole("tab", { name: "Code" }),
	).toHaveAttribute("aria-selected", "true");
	await expect(page.getByRole("tabpanel", { name: "Code" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Editor" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Preview" })).toBeVisible();
	await expect(page.getByRole("tab", { name: "Preview" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
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

test("uses workspace tabs as the panel visibility controls", async ({
	page,
}) => {
	await page.goto("/");

	const editorTab = page.getByRole("tab", { name: "Editor" });
	await editorTab.click();
	await expect(page.getByRole("region", { name: "Editor" })).toBeHidden();
	await expect(editorTab).toHaveAttribute("aria-selected", "false");
	await editorTab.click();
	await expect(page.getByRole("region", { name: "Editor" })).toBeVisible();

	const tutorTab = page.getByRole("tab", { name: "Tutor" });
	await tutorTab.click();
	await expect(page.getByRole("region", { name: "Tutor" })).toBeHidden();
	await tutorTab.click();
	await expect(page.getByRole("region", { name: "Tutor" })).toBeVisible();

	const previewTab = page.getByRole("tab", { name: "Preview" });
	await previewTab.focus();
	await previewTab.press("Enter");
	await expect(page.getByRole("region", { name: "Preview" })).toBeHidden();
	await expect(previewTab).toHaveAttribute("aria-selected", "false");
	await previewTab.click();
	await expect(page.getByRole("region", { name: "Preview" })).toBeVisible();

	const outputTab = page.getByRole("tab", { name: "Output" });
	await outputTab.click();
	await outputTab.click();
	await expect(page.getByRole("region", { name: "Output" })).toBeHidden();
	await expect(outputTab).toHaveAttribute("aria-selected", "false");
});

test("places application preferences and provider guidance in Settings", async ({
	page,
}) => {
	await page.goto("/");
	await page
		.getByRole("tablist", { name: "Application" })
		.getByRole("tab", { name: "Settings" })
		.click();

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
	const applicationTabs = page.getByRole("tablist", { name: "Application" });
	const placeholders = [
		{ name: "Examples", text: "one-document workflow" },
		{ name: "Docs", text: "Language reference and help" },
		{ name: "About", text: "Gestalten in Code" },
	];

	for (const { name, text } of placeholders) {
		await applicationTabs.getByRole("tab", { name }).click();
		await expect(page.getByRole("tabpanel", { name })).toContainText(text);
	}
});

test("recovers from invalid persisted layout state", async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			"gic.workspaceLayout",
			JSON.stringify({
				version: 3,
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

test("persists keyboard resizing, hidden regions, and the selected lower tab", async ({
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
	await page.getByRole("tab", { name: "Tutor" }).click();
	await expect(page.getByRole("region", { name: "Tutor" })).toBeHidden();

	await page.reload();

	await expect(page.getByRole("region", { name: "Tutor" })).toBeHidden();
	await expect(page.getByRole("tab", { name: "Tutor" })).toHaveAttribute(
		"aria-selected",
		"false",
	);
	await expect(page.getByRole("tab", { name: "Output" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	expect((await editor.boundingBox())?.width).toBeCloseTo(resizedWidth!, 0);
});

test("reopens a hidden lower panel on error and selects Problems", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Output" }).click();
	await page.getByRole("tab", { name: "Output" }).click();
	await expect(page.getByRole("tab", { name: "Problems" })).toHaveAttribute(
		"aria-selected",
		"false",
	);

	await setEditorSource(page, "circle(50, 50);");

	await expect(page.getByRole("tab", { name: "Problems (1)" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	await expect(page.locator("#problems")).toContainText(
		"Function 'circle' expects 3 arguments, but got 2.",
	);
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

test("Reset Layout restores visible regions and the default lower tab", async ({
	page,
}) => {
	await page.goto("/");
	await setEditorSource(page, "circle(50, 50, 30);");
	await page.getByRole("tab", { name: "Output" }).click();
	await page.getByRole("tab", { name: "Editor" }).click();
	await page.getByRole("tab", { name: "Preview" }).click();
	await page.getByRole("tab", { name: "Tutor" }).click();
	await expect(page.getByRole("region", { name: "Editor" })).toBeHidden();
	await expect(page.getByRole("region", { name: "Preview" })).toBeHidden();
	await expect(page.getByRole("region", { name: "Tutor" })).toBeHidden();

	await page
		.getByRole("tablist", { name: "Application" })
		.getByRole("tab", { name: "Settings" })
		.click();
	await page.getByRole("button", { name: "Reset Layout" }).click();
	await page
		.getByRole("tablist", { name: "Application" })
		.getByRole("tab", { name: "Code" })
		.click();

	await expect(page.getByRole("region", { name: "Editor" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Preview" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Tutor" })).toBeVisible();
	await expect(page.getByRole("tab", { name: "Preview" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	await expect(page.getByRole("tab", { name: "Problems" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	await expect(page.locator(".view-line")).toHaveText("circle(50, 50, 30);");
});
