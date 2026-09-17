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

test("opens the command palette with F1 immediately after launch", async ({
	page,
}) => {
	await page.goto("/");
	await page.keyboard.press("F1");

	const palette = page.locator(".quick-input-widget");
	await expect(palette).toBeVisible();
	await palette.locator("input").pressSequentially("Add Cursor Above");
	await expect(
		palette.getByText("Add Cursor Above", { exact: true }),
	).toBeVisible();
});

test("opens the command palette and formats the GIC document", async ({
	page,
}) => {
	const source = "if(true){circle(50,50,10);}";
	const formatted = `if (true) {
\tcircle(50, 50, 10);
}
`;

	await page.goto("/");
	await setEditorSource(page, source);
	await page.keyboard.press("F1");

	const palette = page.locator(".quick-input-widget");
	await expect(palette).toBeVisible();
	await expect(palette.locator(".monaco-list-row")).not.toHaveCount(0);
	await palette.locator("input").pressSequentially("Format Document");
	await expect(
		palette.getByText("Format Document", { exact: true }),
	).toBeVisible();
	await page.keyboard.press("Enter");

	await expect(palette).toBeHidden();
	await page.locator(".view-lines").click({ position: { x: 5, y: 5 } });
	await page.keyboard.press("Control+A");
	await expect(page.getByRole("textbox", { name: "GiC" })).toHaveValue(
		formatted,
	);
});

test("offers GIC completion through Monaco", async ({ page }) => {
	await page.goto("/");
	await setEditorSource(page, "cir");
	await page.keyboard.press("Control+Space");

	const suggestions = page.locator(".suggest-widget");
	await expect(suggestions).toBeVisible();
	await expect(
		suggestions.getByText("circle", { exact: true }).first(),
	).toBeVisible();
	await page.keyboard.press("Control+Space");
	await expect(page.locator(".suggest-details")).toContainText(
		"Draw a circle centered at (x, y).",
	);
});

test("shows GIC hover information through Monaco", async ({ page }) => {
	await page.goto("/");
	await setEditorSource(page, "circle(50, 50, 10);");
	await page.keyboard.press("Home");
	await page.keyboard.press("ArrowRight");
	await page.keyboard.press("Control+K");
	await page.keyboard.press("Control+I");

	const hover = page.locator(".monaco-hover:not(.hidden)");
	await expect(hover).toBeVisible();
	await expect(hover).toContainText(
		"circle(x: number, y: number, radius: number)",
	);
	await expect(hover).toContainText("Draw a circle centered at (x, y).");
});

test("shows active GIC signature help through Monaco", async ({ page }) => {
	await page.goto("/");
	await setEditorSource(page, "circle(50, ");
	await page.keyboard.press("Control+Shift+Space");

	const signatureHelp = page.locator(".parameter-hints-widget");
	await expect(signatureHelp).toBeVisible();
	await expect(signatureHelp).toContainText(
		"circle(x: number, y: number, radius: number)",
	);
	await expect(signatureHelp.locator(".parameter.active")).toHaveText(
		"y: number",
	);
});

test("surfaces visible user symbols through Monaco", async ({ page }) => {
	await page.goto("/");
	await setEditorSource(
		page,
		`func motif(size) {
	let radius = size;
	rad`,
	);
	await page.keyboard.press("Control+Space");

	const suggestions = page.locator(".suggest-widget");
	await expect(suggestions).toBeVisible();
	await expect(
		suggestions.getByText("radius", { exact: true }).first(),
	).toBeVisible();

	await page.keyboard.press("Escape");
	await setEditorSource(
		page,
		`func motif(size, count) {
	return size;
}
motif(10, `,
	);
	await page.keyboard.press("Control+Shift+Space");
	const signatureHelp = page.locator(".parameter-hints-widget");
	await expect(signatureHelp).toContainText("motif(size, count)");
	await expect(signatureHelp.locator(".parameter.active")).toHaveText("count");

	await page.keyboard.press("Escape");
	await setEditorSource(
		page,
		`let radius = 10;
radius;`,
	);
	await page.keyboard.press("Home");
	await page.keyboard.press("ArrowRight");
	await page.keyboard.press("Control+K");
	await page.keyboard.press("Control+I");
	const hover = page.locator(".monaco-hover:not(.hidden)");
	await expect(hover).toContainText("variable radius");
});

test("persists configurable format-on-save behavior", async ({ page }) => {
	const source = "if(true){circle(50,50,10);}";
	const formatted = `if (true) {
	circle(50, 50, 10);
}
`;

	await page.goto("/");
	await page.evaluate(() => localStorage.clear());
	await page.reload();
	await page.getByRole("tab", { name: "Settings" }).click();
	const setting = page.getByRole("checkbox", { name: "Format on save" });
	await expect(setting).toBeChecked();
	await setEditorSource(page, source);
	await page.keyboard.press("Control+S");
	await expect(page.getByRole("textbox", { name: "GiC" })).toHaveValue(
		formatted,
	);

	await setting.uncheck();
	await page.reload();
	await expect(setting).not.toBeChecked();
	await setEditorSource(page, source);
	await page.keyboard.press("Control+S");
	await expect(page.getByRole("textbox", { name: "GiC" })).toHaveValue(source);

	await page.keyboard.press("F1");
	const palette = page.locator(".quick-input-widget");
	await palette.locator("input").pressSequentially("Format Document");
	await page.keyboard.press("Enter");
	await expect(page.getByRole("textbox", { name: "GiC" })).toHaveValue(
		formatted,
	);
});
