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
	await expect(tutor.getByRole("button", { name: "Agent help" })).toBeVisible();
	await tutor.getByRole("button", { name: "Agent help" }).click();
	await expect(tutor.getByRole("note", { name: "Agent help" })).toContainText(
		"/new",
	);
	await expect(tutor.getByRole("note", { name: "Agent help" })).toContainText(
		"Shift+Enter",
	);
	await tutor.getByRole("button", { name: "Agent help" }).click();
	await expect(tutor.getByRole("note", { name: "Agent help" })).toHaveCount(0);
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
	await input.fill("/new");
	await input.press("Enter");
	await expect(
		tutor.getByRole("button", { name: "Send message" }),
	).toBeVisible();
	await expect(tutor).not.toContainText("First line");
});

test("keeps the latest agent message visible as the conversation grows", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Agent" }).click();
	const tutor = page.getByRole("region", { name: "Agent" });
	const transcript = tutor.locator(".agent-messages");
	const input = tutor.getByRole("textbox", { name: "Message agent" });
	await input.fill("Why does `circle` draw here? ".repeat(50));
	await input.press("Enter");
	await expect(tutor.locator(".agent-message-agent")).toContainText(
		"You asked",
	);
	const size = await transcript.evaluate((element) => ({
		content: element.scrollHeight,
		viewport: element.clientHeight,
	}));
	expect(size.content).toBeGreaterThan(size.viewport);
	await expect
		.poll(() =>
			transcript.evaluate(
				(element) =>
					element.scrollHeight - element.clientHeight - element.scrollTop,
			),
		)
		.toBeLessThan(2);
	await tutor.getByRole("button", { name: "Stop agent" }).click();
});

test("uses the surrounding text size for inline and block agent code", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Agent" }).click();
	const tutor = page.getByRole("region", { name: "Agent" });
	const input = tutor.getByRole("textbox", { name: "Message agent" });
	await input.fill("Why does `circle` use three arguments?");
	await input.press("Enter");
	const answer = tutor.locator(".agent-message-agent").last();
	await expect(answer.locator(".agent-markdown p code")).toHaveText("circle");
	await expect(answer.locator("pre code")).toHaveText("rect(10, 10, 20, 20);");
	await expect(
		tutor.getByRole("button", { name: "Send message" }),
	).toBeVisible();
	const fontSizes = await answer.evaluate((element) => {
		const prose = element.querySelector(".agent-markdown p");
		const inlineCode = prose?.querySelector("code");
		const blockCode = element.querySelector("pre code");
		if (!prose || !inlineCode || !blockCode) {
			throw new Error("Agent markdown was not rendered.");
		}
		return {
			prose: parseFloat(getComputedStyle(prose).fontSize),
			inline: parseFloat(getComputedStyle(inlineCode).fontSize),
			block: parseFloat(getComputedStyle(blockCode).fontSize),
			proseFamily: getComputedStyle(prose).fontFamily,
			inlineFamily: getComputedStyle(inlineCode).fontFamily,
			blockFamily: getComputedStyle(blockCode).fontFamily,
		};
	});
	expect(fontSizes.inline).toBeGreaterThanOrEqual(fontSizes.prose);
	expect(fontSizes.block).toBeGreaterThanOrEqual(fontSizes.prose);
	expect(fontSizes.inlineFamily).toBe(fontSizes.proseFamily);
	expect(fontSizes.blockFamily).toBe(fontSizes.proseFamily);
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

test("stopping a streamed answer removes its unfinished text", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("tab", { name: "Agent" }).click();
	const tutor = page.getByRole("region", { name: "Agent" });
	const question = "How should I begin drawing a row of circles?";
	const agentMessages = tutor.locator(".agent-message-agent");
	await tutor.getByRole("textbox", { name: "Message agent" }).fill(question);
	await tutor.getByRole("textbox", { name: "Message agent" }).press("Enter");
	await expect(agentMessages).toHaveCount(1);
	await tutor.getByRole("button", { name: "Stop agent" }).click();
	await expect(tutor).toContainText("The question was cancelled.");
	await expect(agentMessages).toHaveCount(0);
	await expect(tutor.locator(".agent-message-student")).toContainText(question);

	await page.reload();
	await page.getByRole("tab", { name: "Agent" }).click();
	await expect(
		page.getByRole("region", { name: "Agent" }).locator(".agent-message-agent"),
	).toHaveCount(0);
});

test("renders safe agent markdown without executing raw HTML", async ({
	page,
}) => {
	await page.goto("/");
	const sketchName = await page
		.getByRole("tab", { name: /^sketch_/ })
		.getAttribute("aria-label");
	if (sketchName === null) throw new Error("Sketch tab not found.");
	await page.evaluate((name) => {
		localStorage.setItem(
			`gic.agentSession:${name}`,
			[
				JSON.stringify({
					type: "session",
					id: "local",
					name,
					startedAt: "2026-09-24T10:00:00Z",
					sketchId: name,
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
	}, sketchName);
	await page.reload();
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
