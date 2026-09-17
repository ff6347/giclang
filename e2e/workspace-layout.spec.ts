// ABOUTME: Verifies the persistent, keyboard-operable browser IDE workspace.
// ABOUTME: Covers panel visibility, status tabs, error reopening, and reset behavior.

import { expect, test } from "@playwright/test";
import { setEditorSource } from "./editor.ts";

test("shows the editor, preview, lower panel, and unavailable tutor", async ({
	page,
}) => {
	await page.goto("/");

	await expect(page.getByRole("region", { name: "Editor" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Preview" })).toBeVisible();
	await expect(page.getByRole("tab", { name: "Problems" })).toBeVisible();
	await expect(page.getByRole("tab", { name: "Output" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Tutor" })).toContainText(
		"Tutor unavailable",
	);
	await expect(
		page.getByRole("button", { name: "Retry tutor setup" }),
	).toBeVisible();
	await expect(
		page
			.getByRole("region", { name: "Tutor" })
			.getByRole("button", { name: "Hide tutor" }),
	).toBeVisible();
	await page.getByRole("button", { name: "Retry tutor setup" }).click();
	await expect(page.getByRole("region", { name: "Tutor" })).toContainText(
		"Tutor is still unavailable.",
	);
});

test("recovers from invalid persisted layout state", async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			"gic.workspaceLayout",
			JSON.stringify({
				version: 1,
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
	await page
		.getByRole("navigation", { name: "Workspace controls" })
		.getByRole("button", { name: "Hide tutor" })
		.click();
	await expect(page.getByRole("region", { name: "Tutor" })).toBeHidden();

	await page.reload();

	await expect(page.getByRole("region", { name: "Tutor" })).toBeHidden();
	await expect(
		page
			.getByRole("navigation", { name: "Workspace controls" })
			.getByRole("button", { name: "Show tutor" }),
	).toBeVisible();
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
	await page.getByRole("button", { name: "Hide lower panel" }).click();
	await expect(
		page.getByRole("button", { name: "Show lower panel" }),
	).toBeVisible();
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
	await page.getByRole("button", { name: "Hide editor" }).click();
	await page.getByRole("button", { name: "Hide preview" }).click();
	await page
		.getByRole("navigation", { name: "Workspace controls" })
		.getByRole("button", { name: "Hide tutor" })
		.click();
	await expect(page.getByRole("region", { name: "Editor" })).toBeHidden();
	await expect(page.getByRole("region", { name: "Preview" })).toBeHidden();
	await expect(page.getByRole("region", { name: "Tutor" })).toBeHidden();

	await page.getByRole("button", { name: "Reset Layout" }).click();

	await expect(page.getByRole("region", { name: "Editor" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Preview" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Tutor" })).toBeVisible();
	await expect(page.getByRole("tab", { name: "Problems" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	await expect(page.locator(".view-line")).toHaveText("circle(50, 50, 30);");
});
