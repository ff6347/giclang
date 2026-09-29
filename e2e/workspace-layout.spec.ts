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
	await expect(
		page.getByRole("tab", { name: /^sketch_\d{8}[a-z]+$/ }),
	).toBeVisible();
	await expect(page.getByRole("tab", { name: "Preview" })).toBeVisible();
	await expect(page.getByRole("tab", { name: "Problems" })).toBeVisible();
	await expect(page.getByRole("tab", { name: "Output" })).toBeVisible();
	await expect(page.getByRole("region", { name: "Agent" })).toHaveCount(0);
});

test("uses Monaco's font stack throughout the application", async ({
	page,
}) => {
	await page.goto("/");
	const fonts = await page.evaluate(async () => {
		const editorLine = document.querySelector(".view-line");
		const applicationTab = document.querySelector("#flexlayout-tabbutton-code");
		if (!(editorLine instanceof HTMLElement)) {
			throw new Error("Monaco view line not found.");
		}
		if (!(applicationTab instanceof HTMLElement)) {
			throw new Error("Application tab not found.");
		}
		await document.fonts.load('16px "IBM Plex Mono"');
		return {
			body: getComputedStyle(document.body).fontFamily,
			application: getComputedStyle(applicationTab).fontFamily,
			editor: getComputedStyle(editorLine).fontFamily,
			loaded: [...document.fonts].some(
				(face) =>
					face.family.includes("IBM Plex Mono") && face.status === "loaded",
			),
		};
	});

	expect(fonts.body).toContain("IBM Plex Mono");
	expect(fonts.application).toContain("IBM Plex Mono");
	expect(fonts.editor).toContain("IBM Plex Mono");
	expect(fonts.loaded).toBe(true);
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

test("uses compact application and panel tab rows", async ({ page }) => {
	await page.goto("/");
	const applicationTab = await page
		.getByRole("tab", { name: "Gestalten" })
		.boundingBox();
	const panelTab = await page
		.getByRole("tab", { name: "Preview" })
		.boundingBox();

	expect(applicationTab).not.toBeNull();
	expect(panelTab).not.toBeNull();
	expect(applicationTab!.height).toBeLessThanOrEqual(26);
	expect(panelTab!.height).toBeLessThanOrEqual(26);
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
	const allowAgentCopying = page.getByRole("checkbox", {
		name: "Allow copying agent responses",
	});
	await expect(allowAgentCopying).not.toBeChecked();
	await page.getByText("Allow copying agent responses").click();
	await expect(allowAgentCopying).toBeChecked();
	await expect(
		page.getByRole("button", { name: "Reset Layout" }),
	).toBeVisible();
	await expect(
		page.getByRole("region", { name: "Settings" }),
	).not.toContainText("Agent provider");
});

test("settings selects stay aligned and reveal full-width options", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1600, height: 900 });
	await page.goto("/");
	await page.getByRole("tab", { name: "Settings" }).click();
	const appearance = page.getByRole("combobox", { name: "Appearance" });
	const trigger = await appearance.boundingBox();
	expect(trigger).not.toBeNull();
	expect(trigger!.width).toBeLessThan(550);
	await expect(appearance.locator(".settings-select-indicator")).toBeVisible();
	await appearance.click();
	const popup = await page.getByRole("listbox").boundingBox();
	expect(popup).not.toBeNull();
	expect(popup!.width).toBeGreaterThanOrEqual(trigger!.width - 2);
	expect(Math.abs(popup!.x - trigger!.x)).toBeLessThan(3);
});

test("defaults to system appearance and persists an explicit theme", async ({
	page,
}) => {
	await page.emulateMedia({ colorScheme: "dark" });
	await page.goto("/");

	await expect(page.locator("html")).toHaveAttribute("data-theme", "vs-dark");
	await expect(page.locator(".monaco-editor")).toHaveCSS(
		"background-color",
		"rgb(30, 30, 30)",
	);
	await page.getByRole("tab", { name: "Settings" }).click();
	const appearance = page.getByRole("combobox", { name: "Appearance" });
	const lightTheme = page.getByRole("combobox", { name: "Light theme" });
	const darkTheme = page.getByRole("combobox", { name: "Dark theme" });
	await expect(appearance.locator(".settings-select-value")).toHaveText(
		"System",
	);
	await expect(lightTheme.locator(".settings-select-value")).toHaveText(
		"VS Light",
	);
	await expect(darkTheme.locator(".settings-select-value")).toHaveText(
		"VS Dark",
	);

	await darkTheme.click();
	await page.getByRole("option", { name: "Catppuccin Mocha" }).click();
	await expect(page.locator("html")).toHaveAttribute(
		"data-theme",
		"catppuccin-mocha",
	);
	await page.getByRole("tab", { name: "Gestalten" }).click();
	await expect(page.locator(".monaco-editor")).toHaveCSS(
		"background-color",
		"rgb(30, 30, 46)",
	);
	await page.getByRole("tab", { name: "Settings" }).click();
	await appearance.click();
	await page.getByRole("option", { name: "Light", exact: true }).click();
	await lightTheme.click();
	await page.getByRole("option", { name: "macOS Classic" }).click();
	await expect(page.locator("html")).toHaveAttribute(
		"data-theme",
		"macos-classic",
	);
	await page.getByRole("tab", { name: "Gestalten" }).click();
	await expect(page.locator(".monaco-editor")).toHaveCSS(
		"background-color",
		"rgb(255, 255, 255)",
	);
	await page.reload();
	await expect(page.locator("html")).toHaveAttribute(
		"data-theme",
		"macos-classic",
	);
	await page.getByRole("tab", { name: "Settings" }).click();
	await expect(
		page
			.getByRole("combobox", { name: "Appearance" })
			.locator(".settings-select-value"),
	).toHaveText("Light");
	await expect(
		page
			.getByRole("combobox", { name: "Light theme" })
			.locator(".settings-select-value"),
	).toHaveText("macOS Classic");
	await expect(
		page
			.getByRole("combobox", { name: "Dark theme" })
			.locator(".settings-select-value"),
	).toHaveText("Catppuccin Mocha");
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

test("shows bundled Docs and About content", async ({ page }) => {
	await page.goto("/");
	const content = [
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

test("migrates a legacy Tutor tab into Agent", async ({ page }) => {
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
	await expect(page.getByRole("tab", { name: "Agent" })).toBeVisible();
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

test("shows the panel drag cursor while moving a tab", async ({ page }) => {
	await page.goto("/");
	const outputTab = page.getByRole("tab", { name: "Output" });
	const previewTab = page.getByRole("tab", { name: "Preview" });
	const outputBox = await outputTab.boundingBox();
	const previewBox = await previewTab.boundingBox();
	expect(outputBox).not.toBeNull();
	expect(previewBox).not.toBeNull();

	await outputTab.hover();
	await expect(outputTab).toHaveCSS("cursor", "grab");

	await page.mouse.move(
		outputBox!.x + outputBox!.width / 2,
		outputBox!.y + outputBox!.height / 2,
	);
	await page.mouse.down();
	await expect(outputTab).toHaveCSS("cursor", "grabbing");
	await page.mouse.move(
		previewBox!.x + previewBox!.width / 2,
		previewBox!.y + previewBox!.height / 2,
		{ steps: 10 },
	);
	const dropPreview = page.locator(".flexlayout__outline_rect");
	await expect(dropPreview).toBeVisible();
	await expect(dropPreview).toHaveCSS("border-top-style", "solid");
	await expect(dropPreview).toHaveCSS("border-radius", "0px");
	expect(
		await dropPreview.evaluate(
			(element) => getComputedStyle(element).backgroundColor,
		),
	).not.toBe("rgba(0, 0, 0, 0)");
	await page.mouse.up();
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
