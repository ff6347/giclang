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
	const insets = await tutor.locator(".agent-composer").evaluate((element) => {
		const panel = element.closest<HTMLElement>("[aria-label='Agent']");
		if (panel === null) throw new Error("Agent panel not found.");
		const panelBox = panel.getBoundingClientRect();
		const composerBox = element.getBoundingClientRect();
		return {
			left: composerBox.left - panelBox.left,
			right: panelBox.right - composerBox.right,
		};
	});
	expect(insets.left).toBe(insets.right);
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
	await expect(tutor.locator("pre code")).toContainText("rect(");
	await expect(tutor).toContainText("You: First line");
	await expect(tutor).toContainText("Second line");
	await expect(tutor).toContainText("smallest change");
	await expect(tutor.locator(".agent-message").last()).toHaveCSS(
		"border-bottom-width",
		"0px",
	);
	await expect(tutor.locator(".agent-message").nth(1)).toHaveCSS(
		"padding-top",
		"16px",
	);
	await expect(tutor.locator(".agent-message").last()).toHaveCSS(
		"padding-top",
		"16px",
	);
	const codeBlock = tutor.locator("pre code");
	await expect(codeBlock).toHaveText("rect(10, 10, 20, 20);");
	const codeShadowSpace = await tutor
		.locator(".agent-messages")
		.evaluate((messages) => {
			const code = messages.querySelector("pre code");
			if (code === null) throw new Error("Agent code block not found.");
			const messagesBox = messages.getBoundingClientRect();
			const codeBox = code.getBoundingClientRect();
			return {
				left: codeBox.left - messagesBox.left,
				right: messagesBox.right - codeBox.right,
			};
		});
	expect(codeShadowSpace.right).toBeGreaterThanOrEqual(3);
	await tutor.getByRole("button", { name: "New session" }).click();
	await expect(
		tutor.getByRole("button", { name: "Send message" }),
	).toBeVisible();
	await expect(tutor).not.toContainText("First line");
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

test("renders safe agent markdown without executing raw HTML", async ({
	page,
}) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			"gic.agentSession:sketch_20260924a",
			[
				JSON.stringify({
					type: "session",
					id: "local",
					name: "sketch_20260924a",
					startedAt: "2026-09-24T10:00:00Z",
					sketchId: "sketch_20260924a",
				}),
				JSON.stringify({
					type: "message",
					sessionId: "local",
					role: "agent",
					text: 'Use `rect` first.<script>window.__gicMarkdownExecuted = true</script><img src="x" onerror="window.__gicMarkdownExecuted = true">\n\n```gic\nrect(10, 10, 20, 20);\n```',
					at: "2026-09-24T10:00:01Z",
				}),
			].join("\n"),
		);
	});
	await page.goto("/");
	await page.getByRole("tab", { name: "Agent" }).click();
	const tutor = page.getByRole("region", { name: "Agent" });
	await expect(tutor.locator("pre code")).toHaveText("rect(10, 10, 20, 20);");
	await expect(tutor.locator("script")).toHaveCount(0);
	await expect(tutor.locator("img")).toHaveCount(0);
	expect(await page.evaluate(() => "__gicMarkdownExecuted" in window)).toBe(
		false,
	);
	await expect(tutor.locator("pre code")).toHaveCSS("user-select", "none");

	await page.getByRole("tab", { name: "Settings" }).click();
	await page
		.getByRole("checkbox", { name: "Allow copying agent responses" })
		.click();
	await page.getByRole("tab", { name: "Gestalten" }).click();
	await page.getByRole("tab", { name: "Agent" }).click();
	await expect(
		page.getByRole("region", { name: "Agent" }).locator("pre code"),
	).not.toHaveCSS("user-select", "none");
});
