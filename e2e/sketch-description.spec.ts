// ABOUTME: Verifies the browser workspace omits desktop-only Description UI.
// ABOUTME: Preserves source-only save and recovery behavior in the PWA.

import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { setEditorSource } from "./editor.ts";

async function chooseFileCommand(
	page: import("@playwright/test").Page,
	name: string,
) {
	await page.getByRole("menuitem", { name: "File", exact: true }).click();
	await page
		.getByRole("menu", { name: "File" })
		.getByRole("menuitem", { name, exact: true })
		.click();
}

test("ignores description-only browser recovery snapshots", async ({
	page,
}) => {
	await page.addInitScript(() => {
		const description = {
			metadata: {
				title: "Private title",
				order: 0,
				enabled: true,
				categories: [],
				tags: [],
			},
			body: "Private body",
		};
		localStorage.setItem(
			"gic.recovery.v1",
			JSON.stringify({
				updatedAt: Date.now(),
				document: {
					kind: "file",
					displayName: "private.gic",
					source: "point(1, 1);",
					baselineSource: "point(1, 1);",
					canSave: true,
					requiresSaveAs: false,
					isDirty: true,
					description,
					baselineDescription: {
						...description,
						body: "",
					},
				},
			}),
		);
	});
	await page.goto("/");
	await expect(
		page.getByRole("alertdialog", { name: "Recover unsaved sketch?" }),
	).toHaveCount(0);
	await expect(page.getByRole("tab", { name: "Description" })).toHaveCount(0);
});

test("omits Description and keeps source-only recovery and downloads", async ({
	page,
}) => {
	await page.goto("/");
	await expect(page.getByRole("tab", { name: "Description" })).toHaveCount(0);
	await expect(page.getByLabel("Description")).toHaveCount(0);
	await expect(page.getByRole("textbox", { name: "Markdown" })).toHaveCount(0);

	await setEditorSource(page, "point(10, 10);");
	await page.reload();
	const recovery = page.getByRole("alertdialog", {
		name: "Recover unsaved sketch?",
	});
	await expect(recovery).toBeVisible();
	await recovery.getByRole("button", { name: "Restore" }).click();
	await expect(page.getByRole("textbox", { name: "GiC" })).toHaveValue(
		"point(10, 10);",
	);
	await expect(page.getByRole("tab", { name: "Description" })).toHaveCount(0);

	const download = page.waitForEvent("download");
	await chooseFileCommand(page, "Save As");
	const dialog = page.getByRole("dialog", { name: "Save sketch as" });
	await dialog.getByLabel("File name").fill("source-only.gic");
	await dialog.getByRole("button", { name: "Save copy" }).click();
	const saved = await download;
	expect(saved.suggestedFilename()).toBe("source-only.gic");
	expect(await readFile(await saved.path(), "utf8")).toBe("point(10, 10);\n");
	await expect(
		page.getByRole("tab", { name: "source-only.gic" }),
	).toBeVisible();
});
