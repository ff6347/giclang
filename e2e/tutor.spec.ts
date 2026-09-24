// ABOUTME: Verifies explicit Socratic agent interaction in the shared IDE.
// ABOUTME: Covers visible context, deterministic responses, and session recovery.

import { expect, test } from "@playwright/test";

test("asks the deterministic agent only after explicit submission", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Agent" }).click();
	const tutor = page.getByRole("region", { name: "Agent" });
	await expect(tutor).toContainText("Nothing is sent until you submit");
	await expect(tutor).toContainText(
		"Context: 0 diagnostics, 0 output entries.",
	);
	await expect(tutor.getByText("You:", { exact: false })).toHaveCount(0);

	await tutor.getByLabel("Question").fill("What should I try first?");
	await tutor.getByRole("button", { name: "Ask agent" }).click();
	await expect(tutor).toContainText("You: What should I try first?");
	await expect(tutor).toContainText("smallest change");
});

test("restores an agent session for the same sketch", async ({ page }) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Agent" }).click();
	const tutor = page.getByRole("region", { name: "Agent" });
	await tutor.getByLabel("Question").fill("Explain this output.");
	await tutor.getByRole("button", { name: "Ask agent" }).click();
	await expect(tutor).toContainText("smallest change");

	await page.reload();
	await page.getByRole("tab", { name: "Agent" }).click();
	await expect(page.getByRole("region", { name: "Agent" })).toContainText(
		"Explain this output.",
	);
});
