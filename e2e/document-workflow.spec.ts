// ABOUTME: Verifies visible portable open, save, example, and recovery workflows.
// ABOUTME: Uses local files and browser downloads without persistent file handles.

import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { setEditorSource } from "./editor.ts";

const repeatExamplePath = fileURLToPath(
	new URL("../examples/repeat.gic", import.meta.url),
);

test("opens a local sketch and saves it with its selected filename", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("button", { name: "Open" }).click();
	await page.locator("#open-file").setInputFiles(repeatExamplePath);

	await expect(page.locator("#document-status")).toHaveText("repeat.gic");
	await setEditorSource(page, "point(10, 10);");
	await expect(page.locator("#document-status")).toHaveText("repeat.gic *");

	const download = page.waitForEvent("download");
	await page.getByRole("button", { name: "Save", exact: true }).click();
	expect((await download).suggestedFilename()).toBe("repeat.gic");
	await expect(page.locator("#document-status")).toHaveText("repeat.gic");
	await page.reload();
	await expect(
		page.getByRole("dialog", { name: "Recover unsaved sketch?" }),
	).not.toBeVisible();
});

test("requires Save As for an editable bundled example", async ({ page }) => {
	const source = "if(true){point(10,10);}";
	const formatted = `if (true) {
	point(10, 10);
}
`;

	await page.goto("/");
	await page.locator("#example").selectOption("repeat.gic");

	await expect(page.locator("#document-status")).toHaveText(
		"repeat.gic — example",
	);
	await expect(
		page.getByRole("button", { name: "Save", exact: true }),
	).toBeDisabled();
	await setEditorSource(page, source);
	await expect(page.locator("#document-status")).toHaveText(
		"repeat.gic — example *",
	);

	await page.getByRole("button", { name: "Save As" }).click();
	await expect(page.getByRole("textbox", { name: "GiC" })).toHaveValue(source);
	await page.getByLabel("File name").fill("my-repeat");
	const download = page.waitForEvent("download");
	await page.getByRole("button", { name: "Save copy" }).click();

	expect((await download).suggestedFilename()).toBe("my-repeat.gic");
	await expect(page.locator("#document-status")).toHaveText("my-repeat.gic");
	await expect(page.getByRole("textbox", { name: "GiC" })).toHaveValue(
		formatted,
	);
});

test("cancels replacement of dirty work until the student confirms discard", async ({
	page,
}) => {
	await page.goto("/");
	await setEditorSource(page, "point(10, 10);");
	await page.getByRole("button", { name: "Open" }).click();
	await page.locator("#open-file").setInputFiles(repeatExamplePath);

	const discard = page.getByRole("dialog", { name: "Discard changes?" });
	await expect(discard).toBeVisible();
	await discard.getByRole("button", { name: "Keep editing" }).click();
	await expect(page.getByRole("textbox", { name: "GiC" })).toHaveValue(
		"point(10, 10);",
	);

	await page.locator("#open-file").setInputFiles(repeatExamplePath);
	await discard.getByRole("button", { name: "Discard changes" }).click();
	await expect(page.locator("#document-status")).toHaveText("repeat.gic");
});

test("restores interrupted work only as an unsaved recovery copy", async ({
	page,
}) => {
	await page.goto("/");
	await setEditorSource(page, "point(10, 10);");
	await page.reload();

	const recovery = page.getByRole("dialog", {
		name: "Recover unsaved sketch?",
	});
	await expect(recovery).toBeVisible();
	await recovery.getByRole("button", { name: "Restore" }).click();
	await expect(page.locator("#document-status")).toHaveText(
		"Recovered sketch *",
	);
	await expect(
		page.getByRole("button", { name: "Save", exact: true }),
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
		page.getByRole("dialog", { name: "Recover unsaved sketch?" }),
	).not.toBeVisible();
	await expect(page.locator("#document-status")).toHaveText("Untitled sketch");
});
