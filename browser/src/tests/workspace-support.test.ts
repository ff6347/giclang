// ABOUTME: Verifies desktop workspace support presentation mapping.
// ABOUTME: Covers file titles, labels, and assistant instructions without a host.

import assert from "node:assert/strict";
import test from "node:test";
import {
	assistantPresentation,
	supportFileLabel,
	supportFileTitle,
} from "../lib/workspace-support.ts";

test("supportFileTitle maps known managed files to friendly names", () => {
	assert.equal(supportFileTitle("AGENTS.md"), "AGENTS.md");
	assert.equal(
		supportFileTitle(".agents/skills/gic-tutor/SKILL.md"),
		"Tutor policy",
	);
	assert.equal(
		supportFileTitle(".agents/skills/gic-tutor/references/language.md"),
		"Language reference",
	);
	assert.equal(supportFileTitle(".unknown/file.md"), ".unknown/file.md");
});

test("supportFileLabel spells each file state", () => {
	assert.equal(supportFileLabel("missing"), "Missing");
	assert.equal(supportFileLabel("upToDate"), "Up to date");
	assert.equal(supportFileLabel("modified"), "Modified");
});

test("assistantPresentation offers launch when the CLI is available", () => {
	const codex = assistantPresentation("codex", true);

	assert.equal(codex.title, "Codex");
	assert.equal(codex.canLaunch, true);
	assert.equal(codex.label, "Launch Codex");
	assert.equal(codex.guidance, "Opens a terminal in this workspace.");
});

test("assistantPresentation explains installation when the CLI is missing", () => {
	const opencode = assistantPresentation("opencode", false);

	assert.equal(opencode.title, "OpenCode");
	assert.equal(opencode.canLaunch, false);
	assert.match(opencode.guidance, /Install the OpenCode CLI/);
});
