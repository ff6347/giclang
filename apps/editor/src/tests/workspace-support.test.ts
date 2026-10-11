// ABOUTME: Verifies desktop workspace support presentation mapping.
// ABOUTME: Covers file titles, labels, and assistant instructions without a host.

import assert from "node:assert/strict";
import test from "node:test";
import type { WorkspaceStatus } from "../lib/workspace-support.ts";
import {
	assistantPresentation,
	supportFileLabel,
	supportFilePresentation,
	supportFileTitle,
} from "../lib/workspace-support.ts";

test("supportFileTitle maps known managed files to friendly names", () => {
	assert.equal(supportFileTitle("AGENTS.md"), "AGENTS.md");
	assert.equal(supportFileTitle(".agents/skills/gic-agent/SKILL.md"), "Skill");
	assert.equal(
		supportFileTitle(".agents/skills/gic-agent/references/language.md"),
		"Language reference",
	);
	assert.equal(supportFileTitle(".unknown/file.md"), ".unknown/file.md");
});

test("supportFileLabel distinguishes absent destinations from uninstalled files", () => {
	assert.equal(supportFileLabel("missing", true), "Missing");
	assert.equal(supportFileLabel("missing", false), "Not installed");
	assert.equal(supportFileLabel("upToDate"), "Up to date");
	assert.equal(supportFileLabel("modified"), "Modified");
});

test("supportFilePresentation shows native destinations and installation state", () => {
	const file = {
		path: ".agents/skills/gic-agent/SKILL.md",
		resolvedPath: "/workshops/projects/.agents/skills/gic-agent/SKILL.md",
		state: "missing" as const,
	};

	const uninstalledWorkspace = {
		installed: false,
		directory: "/workshops/projects",
		files: [file],
	} satisfies WorkspaceStatus;
	assert.deepEqual(
		supportFilePresentation(file, uninstalledWorkspace.installed),
		{
			destination: file.resolvedPath,
			state: "Not installed",
		},
	);
	for (const [state, label] of [
		["modified", "Modified"],
		["upToDate", "Up to date"],
	] as const) {
		const retainedFile = { ...file, state };
		assert.deepEqual(
			supportFilePresentation(retainedFile, uninstalledWorkspace.installed),
			{
				destination: file.resolvedPath,
				state: label,
			},
		);
	}
	const installedWorkspace = {
		...uninstalledWorkspace,
		installed: true,
	};
	assert.deepEqual(
		supportFilePresentation(file, installedWorkspace.installed),
		{
			destination: file.resolvedPath,
			state: "Missing",
		},
	);
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
