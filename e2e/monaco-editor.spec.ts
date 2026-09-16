// ABOUTME: Verifies Monaco editing, highlighting, diagnostics, and local asset loading.
// ABOUTME: Exercises the packaged editor through its visible browser interface.

import { expect, test, type Page } from "@playwright/test";
import { setEditorSource } from "./editor.ts";

function cornerAlpha(page: Page) {
	return page.locator("#canvas").evaluate((element) => {
		if (!(element instanceof HTMLCanvasElement)) {
			throw new Error("Expected #canvas to be a canvas element.");
		}
		const context = element.getContext("2d");
		if (context === null) {
			throw new Error("Expected a 2D canvas context.");
		}
		return context.getImageData(0, 0, 1, 1).data[3];
	});
}

test("edits GIC source in Monaco and marks the diagnostic range", async ({
	page,
}) => {
	await page.goto("/");

	const editor = page.getByRole("textbox", { name: "GiC" });
	const editorSurface = page.locator(".monaco-editor");
	await expect(editorSurface).toBeVisible();
	await expect(editor).toBeAttached();
	await expect(page.locator("textarea#code")).toHaveCount(0);

	const source = `let size = 20;
circle(50, 50);
point(10, 10);`;
	await setEditorSource(page, source);

	await expect(page.locator(".view-line")).toHaveText(source.split("\n"));
	await expect(page.locator("#problems")).toHaveText(
		"Line 2, columns 1–7: Function 'circle' expects 3 arguments, but got 2.",
	);
	await expect(page.locator(".squiggly-error")).toBeVisible();

	const tokens = await page
		.locator(".view-lines span")
		.evaluateAll((elements) =>
			elements
				.filter((element) => element.children.length === 0)
				.map((element) => ({
					className: element.className,
					text: element.textContent?.trim() ?? "",
				}))
				.filter(({ text }) => text.length > 0),
		);
	const keywordClass = tokens.find(({ text }) => text === "let")?.className;
	const identifierClass = tokens.find(({ text }) =>
		text.startsWith("size"),
	)?.className;
	const builtInClass = tokens.find(({ text }) => text === "point")?.className;
	expect(keywordClass).toBeTruthy();
	expect(identifierClass).toBeTruthy();
	expect(builtInClass).toBeTruthy();
	expect(keywordClass).not.toBe(identifierClass);
	expect(builtInClass).not.toBe(identifierClass);
});

test("loads Monaco without requesting external assets", async ({ page }) => {
	const externalRequests: string[] = [];
	page.on("request", (request) => {
		const url = new URL(request.url());
		if (url.origin !== "http://127.0.0.1:5173") {
			externalRequests.push(request.url());
		}
	});

	await page.goto("/");
	await expect(page.locator(".monaco-editor")).toBeVisible();
	await setEditorSource(page, "point(10, 10);");
	await page.waitForLoadState("networkidle");
	expect(externalRequests).toEqual([]);
});

test("runs one preview after a burst of editor input", async ({ page }) => {
	const previewResults: string[] = [];
	page.on("console", (message) => {
		if (message.type() === "info" && message.text().startsWith("Result:")) {
			previewResults.push(message.text());
		}
	});

	await page.goto("/");
	await setEditorSource(page, "point(10, 10);");

	await expect.poll(() => previewResults).toHaveLength(1);
	await page.waitForTimeout(250);
	expect(previewResults).toHaveLength(1);
});

test("clears the Canvas when the current source cannot be parsed", async ({
	page,
}) => {
	await page.goto("/");
	await setEditorSource(page, 'background("tomato");');
	await expect.poll(() => cornerAlpha(page)).toBe(255);

	await setEditorSource(page, "@");
	await expect(page.locator("#problems")).toContainText("Unexpected character");
	await expect(page.locator(".squiggly-error")).toBeVisible();
	await expect.poll(() => cornerAlpha(page)).toBe(0);
});

test("replaces an active worker without allowing a stale timeout", async ({
	page,
}) => {
	const runawaySource = `func forever() {
	repeat(i, 0, 100000) {}
	return forever();
}
forever();`;

	await page.goto("/");
	await setEditorSource(page, runawaySource);
	await page.waitForTimeout(150);
	await setEditorSource(page, 'background("tomato");');

	await expect.poll(() => cornerAlpha(page)).toBe(255);
	await page.waitForTimeout(500);
	await expect(page.locator("#problems")).toHaveText("");
	await expect.poll(() => cornerAlpha(page)).toBe(255);
});
