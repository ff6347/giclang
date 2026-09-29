// ABOUTME: Exercises shared Description authoring and browser-only persistence boundaries.
// ABOUTME: Drives the real editor panels, document replacement, recovery, and downloads.

import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";

const repeatExamplePath = fileURLToPath(
	new URL(
		"../packages/content/content/examples/repeat/repeat.gic",
		import.meta.url,
	),
);

test("edits description metadata and protects description-only changes", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Description", exact: true }).click();

	const defaultTitle = await page
		.getByRole("textbox", { name: "title" })
		.inputValue();
	expect(defaultTitle).not.toBe("");
	await expect(
		page.getByRole("tab", { name: defaultTitle, exact: true }),
	).toBeVisible();
	await expect(page.getByRole("spinbutton", { name: "order" })).toHaveValue(
		"0",
	);
	await expect(page.getByRole("checkbox", { name: "enabled" })).toBeChecked();
	await expect(page.getByRole("textbox", { name: "categories" })).toBeVisible();
	await expect(page.getByRole("textbox", { name: "tags" })).toBeVisible();
	await expect(page.getByRole("textbox", { name: "Markdown" })).toBeVisible();

	await page.getByRole("textbox", { name: "title" }).fill("A described sketch");
	await page.getByRole("spinbutton", { name: "order" }).fill("2.5");
	await page.getByRole("checkbox", { name: "enabled" }).uncheck();
	await page
		.getByRole("textbox", { name: "categories" })
		.fill("lines\ngeometry");
	await page.getByRole("textbox", { name: "tags" }).fill("Unicode: café");
	await page
		.getByRole("textbox", { name: "Markdown" })
		.fill("A transient description.");

	await page.getByRole("tab", { name: "Examples", exact: true }).click();
	await page.getByRole("button", { name: "Load this example" }).first().click();
	const discard = page.getByRole("alertdialog", { name: "Discard changes?" });
	await expect(discard).toBeVisible();
	await discard.getByRole("button", { name: "Keep editing" }).click();
	await page.getByRole("tab", { name: "Gestalten", exact: true }).click();
	await page.getByRole("tab", { name: "Description", exact: true }).click();
	await expect(page.getByRole("textbox", { name: "Markdown" })).toHaveValue(
		"A transient description.",
	);

	await page.reload();
	const recovery = page.getByRole("alertdialog", {
		name: "Recover unsaved sketch?",
	});
	await expect(recovery).toBeVisible();
	await recovery.getByRole("button", { name: "Restore" }).click();
	await page.getByRole("tab", { name: "Description", exact: true }).click();
	await expect(page.getByRole("textbox", { name: "title" })).toHaveValue(
		"A described sketch",
	);
	await expect(page.getByRole("spinbutton", { name: "order" })).toHaveValue(
		"2.5",
	);
	await expect(
		page.getByRole("checkbox", { name: "enabled" }),
	).not.toBeChecked();
	await expect(page.getByRole("textbox", { name: "categories" })).toHaveValue(
		"lines\ngeometry",
	);
	await expect(page.getByRole("textbox", { name: "tags" })).toHaveValue(
		"Unicode: café",
	);
	await expect(page.getByRole("textbox", { name: "Markdown" })).toHaveValue(
		"A transient description.",
	);
});

test("opening another browser file starts with isolated description defaults", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Description", exact: true }).click();
	await page.getByRole("textbox", { name: "title" }).fill("Private title");
	await page.getByRole("textbox", { name: "Markdown" }).fill("Private body.");
	await page.getByRole("menuitem", { name: "File", exact: true }).click();
	await page
		.getByRole("menu", { name: "File" })
		.getByRole("menuitem", { name: "Open", exact: true })
		.click();
	await page.locator("#open-file").setInputFiles(repeatExamplePath);
	const discard = page.getByRole("alertdialog", { name: "Discard changes?" });
	await discard.getByRole("button", { name: "Discard changes" }).click();

	await page.getByRole("tab", { name: "Description", exact: true }).click();
	await expect(page.getByRole("textbox", { name: "title" })).toHaveValue(
		"repeat",
	);
	await expect(page.getByRole("textbox", { name: "Markdown" })).toHaveValue("");
	await expect(page.getByRole("textbox", { name: "categories" })).toHaveValue(
		"",
	);
});

test("source download retains the transient description without a persistence claim", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("menuitem", { name: "File", exact: true }).click();
	await page
		.getByRole("menu", { name: "File" })
		.getByRole("menuitem", { name: "Open", exact: true })
		.click();
	await page.locator("#open-file").setInputFiles(repeatExamplePath);
	await page.getByRole("tab", { name: "Description", exact: true }).click();
	await page
		.getByRole("textbox", { name: "Markdown" })
		.fill("Browser-only note.");

	await page.getByRole("menuitem", { name: "File", exact: true }).click();
	const download = page.waitForEvent("download");
	await page
		.getByRole("menu", { name: "File" })
		.getByRole("menuitem", { name: "Save", exact: true })
		.click();
	expect((await download).suggestedFilename()).toBe("repeat.gic");

	await expect(page.getByRole("textbox", { name: "Markdown" })).toHaveValue(
		"Browser-only note.",
	);
	await expect(page.getByRole("tab", { name: "repeat.gic *" })).toBeVisible();
	await expect(page.getByText(/description.*saved/i)).toHaveCount(0);
});
