// ABOUTME: Verifies visible portable open, save, and recovery workflows.
// ABOUTME: Uses local files and browser downloads without persistent file handles.

import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { setEditorSource } from "./editor.ts";

const repeatExamplePath = fileURLToPath(
	new URL(
		"../packages/content/content/examples/repeat/repeat.gic",
		import.meta.url,
	),
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

test("format-on-save preserves the accepted randomized preview across Save and Save As", async ({
	page,
}) => {
	const workers: string[] = [];
	page.on("worker", (worker) => workers.push(worker.url()));
	await page.goto("/");
	await setEditorSource(page, "background ( 50 , 50 , random ( 0 , 360 ) ) ;");
	await expect(
		page.getByRole("button", { name: "Download PNG" }),
	).toBeEnabled();
	const renderedPixels = await page.locator("#canvas").evaluate((canvas) => {
		if (!(canvas instanceof HTMLCanvasElement)) {
			throw new Error("Expected the preview canvas.");
		}
		return Array.from(
			canvas.getContext("2d")!.getImageData(0, 0, 100, 100).data,
		);
	});
	const workerCount = workers.length;

	await chooseFileCommand(page, "Save As");
	const dialog = page.getByRole("dialog", { name: "Save sketch as" });
	await dialog.getByLabel("File name").fill("random-sketch.gic");
	const saveAsDownload = page.waitForEvent("download");
	await dialog.getByRole("button", { name: "Save copy" }).click();
	const savedCopy = await saveAsDownload;
	expect(await readFile(await savedCopy.path(), "utf8")).toBe(
		"background(50, 50, random(0, 360));\n",
	);
	await expect(
		page.getByRole("tab", { name: "random-sketch.gic" }),
	).toBeVisible();
	await page.waitForTimeout(250);
	expect(workers.length).toBe(workerCount);
	await expect(page.locator("#canvas")).toHaveJSProperty("width", 100);
	const pixelsAfterSaveAs = await page.locator("#canvas").evaluate((canvas) => {
		if (!(canvas instanceof HTMLCanvasElement)) {
			throw new Error("Expected the preview canvas.");
		}
		return Array.from(
			canvas.getContext("2d")!.getImageData(0, 0, 100, 100).data,
		);
	});
	expect(pixelsAfterSaveAs).toEqual(renderedPixels);

	const saveDownload = page.waitForEvent("download");
	await chooseFileCommand(page, "Save");
	const saved = await saveDownload;
	expect(await readFile(await saved.path(), "utf8")).toBe(
		"background(50, 50, random(0, 360));\n",
	);
	await page.waitForTimeout(250);
	expect(workers.length).toBe(workerCount);
	const pixelsAfterSave = await page.locator("#canvas").evaluate((canvas) => {
		if (!(canvas instanceof HTMLCanvasElement)) {
			throw new Error("Expected the preview canvas.");
		}
		return Array.from(
			canvas.getContext("2d")!.getImageData(0, 0, 100, 100).data,
		);
	});
	expect(pixelsAfterSave).toEqual(renderedPixels);
});

test("presents Save As with the shared Base UI control styling", async ({
	page,
}) => {
	await page.goto("/");
	await chooseFileCommand(page, "Save As");

	const dialog = page.getByRole("dialog", { name: "Save sketch as" });
	await expect(dialog).toBeVisible();
	const styles = await dialog.evaluate((element) => {
		const form = element.querySelector("form");
		const field = element.querySelector(".application-field");
		const input = element.querySelector("input");
		if (
			!(form instanceof HTMLFormElement) ||
			!(field instanceof HTMLElement) ||
			!(input instanceof HTMLInputElement)
		) {
			throw new Error("Save As controls were not rendered.");
		}
		return {
			fieldDisplay: getComputedStyle(field).display,
			fieldGap: getComputedStyle(field).gap,
			formDisplay: getComputedStyle(form).display,
			formGap: getComputedStyle(form).gap,
			inputBorder: getComputedStyle(input).border,
			inputBoxShadow: getComputedStyle(input).boxShadow,
		};
	});

	expect(styles).toEqual({
		fieldDisplay: "flex",
		fieldGap: "8px",
		formDisplay: "flex",
		formGap: "16px",
		inputBorder: "2px solid rgb(0, 0, 0)",
		inputBoxShadow: "rgb(0, 0, 0) 3px 3px 0px 0px",
	});
});

test("cancels replacement of dirty work until the student confirms discard", async ({
	page,
}) => {
	await page.goto("/");
	await setEditorSource(page, "point(10, 10);");
	await chooseFileCommand(page, "Open");
	await page.locator("#open-file").setInputFiles(repeatExamplePath);

	const discard = page.getByRole("alertdialog", { name: "Discard changes?" });
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
	await expect(
		page.getByRole("tab", { name: /^sketch_\d{8}[a-z]+$/ }),
	).toBeVisible();
});
