// ABOUTME: Verifies standalone HTML download from the current successful PWA preview.
// ABOUTME: Covers freshness gating and the exact generated artifact in Firefox.

import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { standaloneHtml } from "../browser/src/lib/standalone-export.ts";
import { setEditorSource } from "./editor.ts";

test("downloads the exact current standalone HTML artifact", async ({
	page,
}) => {
	const source =
		'background(20, 0, 0);\nfill(0, 0, 0);\ncircle(50, 50, 30);\nprint("hello");';
	const downloadButton = page.getByRole("button", {
		name: "Download standalone HTML",
	});
	await page.goto("/");
	await expect(downloadButton).toBeDisabled();

	await setEditorSource(page, source);
	await expect(downloadButton).toBeEnabled();

	await page.getByRole("textbox", { name: "GiC" }).press("End");
	await page.keyboard.type(" ");
	await expect(downloadButton).toBeDisabled();

	await setEditorSource(page, "circle(50, 50);");
	await expect(downloadButton).toBeDisabled();

	await setEditorSource(page, source);
	await expect(downloadButton).toBeEnabled();
	const currentSource = await page
		.getByRole("textbox", { name: "GiC" })
		.inputValue();
	expect(currentSource.replaceAll("\r\n", "\n")).toBe(source);
	const downloadPromise = page.waitForEvent("download");
	await downloadButton.click();
	const download = await downloadPromise;
	expect(download.suggestedFilename()).toBe("gic-sketch.html");

	const [downloaded, runtime, worker] = await Promise.all([
		readFile(await download.path(), "utf8"),
		readFile("browser/public/standalone/runtime.js", "utf8"),
		readFile("browser/public/standalone/worker.js", "utf8"),
	]);
	expect(downloaded).toBe(
		standaloneHtml(currentSource.replaceAll("\n", "\r\n"), runtime, worker),
	);
});
