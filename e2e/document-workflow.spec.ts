// ABOUTME: Verifies visible portable open, save, example, and recovery workflows.
// ABOUTME: Uses local files and browser downloads without persistent file handles.

import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { setEditorSource } from "./editor.ts";

const repeatExamplePath = fileURLToPath(
	new URL("../examples/repeat.gic", import.meta.url),
);

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

function documentTab(page: import("@playwright/test").Page, name: string) {
	return page.getByRole("tab", { name, exact: true });
}

test("offers PWA document commands through the File menu", async ({ page }) => {
	await page.goto("/");
	await page.getByRole("menuitem", { name: "File", exact: true }).click();

	const menu = page.getByRole("menu", { name: "File" });
	await expect(
		menu.getByRole("menuitem", { name: "Open", exact: true }),
	).toBeVisible();
	await expect(
		menu.getByRole("menuitem", { name: "Save", exact: true }),
	).toBeDisabled();
	await expect(
		menu.getByRole("menuitem", { name: "Save As", exact: true }),
	).toBeVisible();
	await expect(
		menu.getByRole("menuitem", { name: "Recent Files" }),
	).toHaveCount(0);
});

test("opens a local sketch and saves it with its selected filename", async ({
	page,
}) => {
	await page.goto("/");
	await chooseFileCommand(page, "Open");
	await page.locator("#open-file").setInputFiles(repeatExamplePath);

	await expect(documentTab(page, "repeat.gic")).toBeVisible();
	await setEditorSource(page, "point(10, 10);");
	await expect(documentTab(page, "repeat.gic *")).toBeVisible();

	const download = page.waitForEvent("download");
	await chooseFileCommand(page, "Save");
	expect((await download).suggestedFilename()).toBe("repeat.gic");
	await expect(documentTab(page, "repeat.gic")).toBeVisible();
	await page.reload();
	await expect(
		page.getByRole("alertdialog", { name: "Recover unsaved sketch?" }),
	).not.toBeVisible();
});

test("requires Save As for an editable bundled example", async ({ page }) => {
	const source = "if(true){point(10,10);}";
	const formatted = `if (true) {
	point(10, 10);
}
`;

	await page.goto("/");
	await page.getByRole("tab", { name: "Examples" }).click();
	await page.getByRole("button", { name: "repeat.gic" }).click();
	await page.getByRole("tab", { name: "Gestalten" }).click();

	await expect(documentTab(page, "repeat.gic")).toBeVisible();
	await page.getByRole("menuitem", { name: "File", exact: true }).click();
	await expect(
		page
			.getByRole("menu", { name: "File" })
			.getByRole("menuitem", { name: "Save", exact: true }),
	).toBeDisabled();
	await page.getByRole("menuitem", { name: "File", exact: true }).click();
	await setEditorSource(page, source);
	await expect(documentTab(page, "repeat.gic *")).toBeVisible();

	await chooseFileCommand(page, "Save As");
	await expect(page.getByRole("textbox", { name: "GiC" })).toHaveValue(source);
	await page.getByLabel("File name").fill("my-repeat");
	const download = page.waitForEvent("download");
	await page.getByRole("button", { name: "Save copy" }).click();

	expect((await download).suggestedFilename()).toBe("my-repeat.gic");
	await expect(documentTab(page, "my-repeat.gic")).toBeVisible();
	await expect(page.getByRole("textbox", { name: "GiC" })).toHaveValue(
		formatted,
	);
});

test("cancels replacement of dirty work until the student confirms discard", async ({
	page,
}) => {
	await page.goto("/");
	await setEditorSource(page, "point(10, 10);");
	await chooseFileCommand(page, "Open");
	await page.locator("#open-file").setInputFiles(repeatExamplePath);

	const discard = page.getByRole("dialog", { name: "Discard changes?" });
	await expect(discard).toBeVisible();
	await discard.getByRole("button", { name: "Keep editing" }).click();
	await expect(page.getByRole("textbox", { name: "GiC" })).toHaveValue(
		"point(10, 10);",
	);

	await page.locator("#open-file").setInputFiles(repeatExamplePath);
	await discard.getByRole("button", { name: "Discard changes" }).click();
	await expect(documentTab(page, "repeat.gic")).toBeVisible();
});

test("restores interrupted work only as an unsaved recovery copy", async ({
	page,
}) => {
	await page.goto("/");
	await setEditorSource(page, "point(10, 10);");
	await page.reload();

	const recovery = page.getByRole("alertdialog", {
		name: "Recover unsaved sketch?",
	});
	await expect(recovery).toBeVisible();
	await recovery.getByRole("button", { name: "Restore" }).click();
	await expect(documentTab(page, "Recovered sketch *")).toBeVisible();
	await page.getByRole("menuitem", { name: "File", exact: true }).click();
	await expect(
		page
			.getByRole("menu", { name: "File" })
			.getByRole("menuitem", { name: "Save", exact: true }),
	).toBeDisabled();
	await expect(page.getByRole("textbox", { name: "GiC" })).toHaveValue(
		"point(10, 10);",
	);
});

test("discards a recovery snapshot older than seven days", async ({ page }) => {
	await page.goto("/");
	await page.evaluate(() => {
		localStorage.setItem(
			"gic.recovery.v1",
			JSON.stringify({
				document: { source: "point(10, 10);" },
				updatedAt: Date.now() - 7 * 24 * 60 * 60 * 1000 - 1,
			}),
		);
	});
	await page.reload();

	await expect(
		page.getByRole("alertdialog", { name: "Recover unsaved sketch?" }),
	).not.toBeVisible();
	await expect(documentTab(page, "Untitled sketch")).toBeVisible();
});
