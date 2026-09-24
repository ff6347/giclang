// ABOUTME: Verifies explicit Socratic agent interaction in the shared IDE.
// ABOUTME: Covers visible context, deterministic responses, and session recovery.

import { expect, test } from "@playwright/test";

test("asks the deterministic agent only after explicit submission", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Agent" }).click();
	const tutor = page.getByRole("region", { name: "Agent" });
	await expect(tutor).not.toContainText("Nothing is sent until you submit");
	await expect(tutor.getByRole("heading", { name: "Agent" })).toHaveCount(0);
	await expect(tutor.getByText("Question", { exact: true })).toHaveCount(0);
	await expect(tutor.getByPlaceholder(/./)).toHaveCount(0);
	await expect(tutor.getByText("You:", { exact: false })).toHaveCount(0);

	const input = tutor.getByRole("textbox", { name: "Message agent" });
	await input.fill("First line");
	const singleLineHeight = await input.evaluate(
		(element) => element.getBoundingClientRect().height,
	);
	await input.press("Shift+Enter");
	await input.pressSequentially("Second line");
	const multilineHeight = await input.evaluate(
		(element) => element.getBoundingClientRect().height,
	);
	expect(multilineHeight).toBeGreaterThan(singleLineHeight);
	await input.press("Enter");
	await expect(tutor.getByRole("button", { name: "Stop agent" })).toBeVisible();
	await expect(tutor).toContainText("You: First line");
	await expect(tutor).toContainText("Second line");
	await expect(tutor).toContainText("smallest change");
	await expect(
		tutor.getByRole("button", { name: "Send message" }),
	).toBeVisible();
});

test("restores an agent session for the same sketch", async ({ page }) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Agent" }).click();
	const tutor = page.getByRole("region", { name: "Agent" });
	await tutor
		.getByRole("textbox", { name: "Message agent" })
		.fill("Explain this output.");
	await tutor.getByRole("textbox", { name: "Message agent" }).press("Enter");
	await expect(tutor).toContainText("smallest change");

	await page.reload();
	await page.getByRole("tab", { name: "Agent" }).click();
	await expect(page.getByRole("region", { name: "Agent" })).toContainText(
		"Explain this output.",
	);
});
