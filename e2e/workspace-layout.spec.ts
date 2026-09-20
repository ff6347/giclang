// ABOUTME: Verifies the persistent, keyboard-operable browser IDE workspace.
// ABOUTME: Covers panel visibility, vertical status panels, persistence, and reset behavior.

import { expect, test } from "@playwright/test";
import { setEditorSource } from "./editor.ts";

test("shows the top-level application tabs and Gestalten workspace", async ({
	page,
}) => {
	await page.goto("/");

	await expect(page.getByRole("heading", { name: "GiC" })).toHaveCount(0);
	await expect(
		page.getByRole("navigation", { name: "Workspace controls" }),
	).toHaveCount(0);
	for (const name of ["Gestalten", "Settings", "Examples", "Docs", "About"]) {
		await expect(page.getByRole("tab", { name })).toBeVisible();
	}
	await expect(page.getByRole("tab", { name: "Gestalten" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	await expect(page.getByRole("tabpanel", { name: "Gestalten" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Editor" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Preview" })).toBeVisible();
	for (const name of ["Untitled sketch", "Preview"]) {
		await expect(page.getByRole("tab", { name })).toBeVisible();
	}
	await expect(page.getByRole("tab", { name: "Problems" })).toBeVisible();
	await expect(page.getByRole("tab", { name: "Output" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Agent" })).toHaveCount(0);
});

test("uses Monaco's font stack throughout the application", async ({
	page,
}) => {
	await page.goto("/");
	const fonts = await page.evaluate(() => {
		const editorLine = document.querySelector(".view-line");
		const applicationTab = document.querySelector("#flexlayout-tabbutton-code");
		if (!(editorLine instanceof HTMLElement)) {
			throw new Error("Monaco view line not found.");
		}
		if (!(applicationTab instanceof HTMLElement)) {
			throw new Error("Application tab not found.");
		}
		return {
			application: getComputedStyle(applicationTab).fontFamily,
			editor: getComputedStyle(editorLine).fontFamily,
		};
	});

	expect(fonts.application).toContain("IBM Plex Mono");
	expect(fonts.editor).toContain("IBM Plex Mono");
});

test("stacks Preview, Output, and Problems beside the editor", async ({
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
	const outputBox = await page
		.getByRole("region", { name: "Output" })
		.boundingBox();

	expect(editorBox).not.toBeNull();
	expect(previewBox).not.toBeNull();
	expect(problemsBox).not.toBeNull();
	expect(outputBox).not.toBeNull();
	expect(outputBox!.y).toBeGreaterThanOrEqual(
		previewBox!.y + previewBox!.height,
	);
	expect(problemsBox!.y).toBeGreaterThanOrEqual(
		outputBox!.y + outputBox!.height,
	);
	for (const box of [outputBox!, problemsBox!]) {
		expect(box.x).toBeCloseTo(previewBox!.x, 0);
		expect(box.width).toBeCloseTo(previewBox!.width, 0);
	}
	expect(editorBox!.x).toBeLessThan(previewBox!.x);
	expect(editorBox!.y).toBeCloseTo(previewBox!.y, 0);
	expect(editorBox!.y + editorBox!.height).toBeCloseTo(
		problemsBox!.y + problemsBox!.height,
		0,
	);
});

test("places application preferences in Settings", async ({ page }) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Settings" }).click();

	await expect(page.getByRole("region", { name: "Settings" })).toBeVisible();
	await expect(page.getByRole("tabpanel", { name: "Gestalten" })).toBeHidden();
	await expect(
		page.getByRole("checkbox", { name: "Format on save" }),
	).toBeVisible();
	await expect(
		page.getByRole("checkbox", { name: "Canvas frame" }),
	).toBeChecked();
	await expect(
		page.getByRole("button", { name: "Reset Layout" }),
	).toBeVisible();
	await expect(
		page.getByRole("region", { name: "Settings" }),
	).not.toContainText("Agent provider");
});

test("persists the Canvas frame setting across reloads", async ({ page }) => {
	const canvasStyle = () =>
		page.locator("#canvas").evaluate((canvas) => {
			const style = getComputedStyle(canvas);
			return {
				borderBottomWidth: style.borderBottomWidth,
				borderRightWidth: style.borderRightWidth,
				boxShadow: style.boxShadow,
				imageRendering: style.imageRendering,
			};
		});

	await page.goto("/");
	await expect.poll(canvasStyle).toEqual({
		borderBottomWidth: "2px",
		borderRightWidth: "2px",
		boxShadow: "rgb(0, 0, 0) 3px 3px 0px 0px",
		imageRendering: "pixelated",
	});

	await page.getByRole("tab", { name: "Settings" }).click();
	await page.getByRole("checkbox", { name: "Canvas frame" }).uncheck();
	await page.getByRole("tab", { name: "Gestalten" }).click();
	await expect.poll(canvasStyle).toEqual({
		borderBottomWidth: "0px",
		borderRightWidth: "0px",
		boxShadow: "none",
		imageRendering: "pixelated",
	});

	await page.reload();
	await page.getByRole("tab", { name: "Settings" }).click();
	await expect(
		page.getByRole("checkbox", { name: "Canvas frame" }),
	).not.toBeChecked();
});

test("shows bundled Examples, Docs, and About content", async ({ page }) => {
	await page.goto("/");
	const content = [
		{ name: "Examples", text: "Repeated grid" },
		{ name: "Docs", text: "Language reference and help" },
		{ name: "About", text: "Pixel Art Icons" },
	];

	for (const { name, text } of content) {
		await page.getByRole("tab", { name }).click();
		await expect(page.getByRole("tabpanel", { name })).toContainText(text);
	}
});

test("applies the shared spacing and heading scale to application pages", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "About" }).click();

	const styles = await page
		.getByRole("tabpanel", { name: "About" })
		.evaluate((panel) => {
			const content = panel.querySelector(".padded-panel");
			const headings = panel.querySelectorAll("h2");
			const title = headings.item(0);
			const sectionTitle = headings.item(1);
			if (
				!(content instanceof HTMLElement) ||
				!(title instanceof HTMLElement) ||
				!(sectionTitle instanceof HTMLElement)
			) {
				throw new Error("About typography was not rendered.");
			}
			return {
				contentGap: getComputedStyle(content).gap,
				contentPadding: getComputedStyle(content).padding,
				sectionTitleFontSize: getComputedStyle(sectionTitle).fontSize,
				titleFontSize: getComputedStyle(title).fontSize,
				titleFontWeight: getComputedStyle(title).fontWeight,
			};
		});

	expect(styles).toEqual({
		contentGap: "16px",
		contentPadding: "16px",
		sectionTitleFontSize: "25.008px",
		titleFontSize: "25.008px",
		titleFontWeight: "500",
	});
});

test("recovers from invalid persisted layout state", async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			"gic.workspaceLayout",
			JSON.stringify({
				version: 5,
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

test("removes Agent from a persisted workspace", async ({ page }) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Settings" }).click();
	await page.getByRole("button", { name: "Reset Layout" }).click();
	await page.evaluate(() => {
		const stored = JSON.parse(
			localStorage.getItem("gic.workspaceLayout") ?? "",
		) as {
			layout: {
				subLayouts: Record<
					string,
					{ layout: { children: Array<Record<string, unknown>> } }
				>;
			};
		};
		stored.layout.subLayouts["code-workspace"].layout.children.push({
			type: "tabset",
			id: "tutor-tabset",
			weight: 35,
			children: [
				{
					type: "tab",
					id: "tutor",
					name: "Agent",
					component: "tutor",
				},
			],
		});
		localStorage.setItem("gic.workspaceLayout", JSON.stringify(stored));
	});

	await page.reload();

	await expect(page.getByRole("region", { name: "Agent" })).toHaveCount(0);
	await expect(page.getByRole("tab", { name: "Gestalten" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
});

test("persists keyboard resizing", async ({ page }) => {
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

	await page.reload();

	expect((await editor.boundingBox())?.width).toBeCloseTo(resizedWidth!, 0);
});

test("moves tabs between Code tabsets and Reset Layout restores defaults", async ({
	page,
}) => {
	await page.goto("/");
	const previewTab = page.getByRole("tab", { name: "Preview" });
	const outputTab = page.getByRole("tab", { name: "Output" });
	const initialPreviewBox = await previewTab.boundingBox();
	const initialOutputBox = await outputTab.boundingBox();
	expect(initialPreviewBox).not.toBeNull();
	expect(initialOutputBox).not.toBeNull();
	expect(initialOutputBox!.y).toBeGreaterThan(initialPreviewBox!.y);

	await outputTab.dragTo(previewTab);
	await expect
		.poll(async () => {
			const outputBox = await outputTab.boundingBox();
			const previewBox = await previewTab.boundingBox();
			return Math.abs((outputBox?.y ?? 0) - (previewBox?.y ?? 0));
		})
		.toBeLessThanOrEqual(2);

	await page.getByRole("tab", { name: "Settings" }).click();
	await page.getByRole("button", { name: "Reset Layout" }).click();
	await expect(page.getByRole("tab", { name: "Gestalten" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	const resetPreviewBox = await page
		.getByRole("tab", { name: "Preview" })
		.boundingBox();
	const resetOutputBox = await page
		.getByRole("tab", { name: "Output" })
		.boundingBox();
	expect(resetPreviewBox).not.toBeNull();
	expect(resetOutputBox).not.toBeNull();
	expect(resetOutputBox!.y).toBeGreaterThan(resetPreviewBox!.y);
});

test("removes an empty tabset after its only tab moves", async ({ page }) => {
	await page.goto("/");
	const previewTab = page.getByRole("tab", { name: "Preview" });
	const problemsTab = page.getByRole("tab", { name: "Problems" });

	await previewTab.dragTo(problemsTab);

	await expect
		.poll(() =>
			page
				.locator(".flexlayout__tabset")
				.evaluateAll(
					(tabsets) =>
						tabsets.filter(
							(tabset) =>
								tabset.querySelector(".flexlayout__tab_button") === null,
						).length,
				),
		)
		.toBe(0);
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

	const outputTab = page.getByRole("tab", { name: "Output" });
	await expect(outputTab).toHaveAttribute("aria-selected", "true");
	await expect(outputTab).toContainText("Output (2)");
	await expect(page.locator("#output").locator("p")).toHaveText([
		"Line 1: first",
		"Line 2: second",
	]);
	await expect(page.getByRole("tab", { name: "Problems" })).toContainText(
		"Problems (1)",
	);
});

test("Reset Layout restores workspace geometry and visible status panels", async ({
	page,
}) => {
	await page.goto("/");
	await setEditorSource(page, "circle(50, 50, 30);");
	const splitter = page
		.locator("[role='separator'][aria-orientation='vertical']")
		.first();
	await splitter.focus();
	await splitter.press("ArrowRight");

	await page.getByRole("tab", { name: "Settings" }).click();
	await page.getByRole("button", { name: "Reset Layout" }).click();
	await expect(page.getByRole("tab", { name: "Gestalten" })).toHaveAttribute(
		"aria-selected",
		"true",
	);

	await expect(page.getByRole("region", { name: "Editor" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Preview" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Agent" })).toHaveCount(0);
	await expect(page.getByRole("region", { name: "Output" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Problems" })).toBeVisible();
	await expect(page.locator(".view-line")).toHaveText("circle(50, 50, 30);");
});
