// ABOUTME: Verifies GIC print output through the Firefox developer console.
// ABOUTME: Covers ordered output and retained output before runtime diagnostics.

import { expect, test } from "@playwright/test";
import { setEditorSource } from "./editor.ts";

test("forwards print output to the developer console in source order", async ({
	page,
}) => {
	const outputMessages: string[] = [];
	page.on("console", (message) => {
		if (message.type() === "info" && message.text().startsWith("Line ")) {
			outputMessages.push(message.text());
		}
	});
	const source = `print("first");
func speak() {
print("inside");
return;
}
speak();
print(true);`;

	await page.goto("/");
	await setEditorSource(page, source);

	await expect
		.poll(() => outputMessages)
		.toEqual(["Line 1: first", "Line 3: inside", "Line 7: true"]);
	await expect(page.locator("#output p")).toHaveText([
		"Line 1: first",
		"Line 3: inside",
		"Line 7: true",
	]);
});

test("logs prior print output before presenting a runtime diagnostic", async ({
	page,
}) => {
	const source = `print("before");
let value = 1 / 0;`;
	const diagnosticText = "Cannot divide by zero.";

	await page.goto("/");
	const outputSeen = page.waitForEvent("console", {
		predicate: (message) => message.text() === "Line 1: before",
	});
	const diagnosticSeen = expect(page.locator("#problems")).toContainText(
		diagnosticText,
	);
	await setEditorSource(page, source);

	const firstObservation = await Promise.race([
		outputSeen.then(() => "output"),
		diagnosticSeen.then(() => "diagnostic"),
	]);
	expect(firstObservation).toBe("output");

	await outputSeen;
	await diagnosticSeen;
	await expect(page.locator("#output")).toHaveText("Line 1: before");
});
