// ABOUTME: Verifies GIC print output through the Firefox developer console.
// ABOUTME: Covers ordered output and retained output before runtime diagnostics.

import { expect, test } from "@playwright/test";

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
	await page.getByLabel("GiC").fill(source);

	await expect
		.poll(() => outputMessages)
		.toEqual(["Line 1: first", "Line 3: inside", "Line 7: true"]);
});

test("logs prior print output before presenting a runtime diagnostic", async ({
	page,
}) => {
	const source = `print("before");
let value = 1 / 0;`;
	const diagnosticText = "Line 2: Cannot divide by zero.";

	await page.goto("/");
	const outputSeen = page.waitForEvent("console", {
		predicate: (message) => message.text() === "Line 1: before",
	});
	const diagnosticSeen = expect(page.locator("#diagnostics")).toHaveText(
		diagnosticText,
	);
	await page.getByLabel("GiC").fill(source);

	const firstObservation = await Promise.race([
		outputSeen.then(() => "output"),
		diagnosticSeen.then(() => "diagnostic"),
	]);
	expect(firstObservation).toBe("output");

	await outputSeen;
	await diagnosticSeen;
});
