// ABOUTME: Reads the canonical Skill export and verifies downloaded ZIP contents.
// ABOUTME: Shares exact source text and archive checks across browser acceptance suites.

import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, type Download } from "@playwright/test";
import { readGicAgentExport } from "../packages/content/dist/content-files.js";

export function readCanonicalSkillExport() {
	return readGicAgentExport();
}

export type CanonicalSkillExport = Awaited<
	ReturnType<typeof readCanonicalSkillExport>
>;

export async function expectDownloadedSkillArchive(
	download: Download,
	expected: CanonicalSkillExport,
) {
	expect(download.suggestedFilename()).toBe("gic-agent.zip");
	const archivePath = await download.path();
	if (archivePath === null) {
		throw new Error("The downloaded Skill archive has no local file path.");
	}
	const directory = await mkdtemp(join(tmpdir(), "gic-agent-skill-e2e-"));
	try {
		const entries = execFileSync("unzip", ["-Z1", archivePath], {
			encoding: "utf8",
		})
			.trimEnd()
			.split(/\r?\n/)
			.sort();
		expect(entries).toEqual([
			"gic-agent/SKILL.md",
			"gic-agent/references/language.md",
		]);
		execFileSync("unzip", ["-q", archivePath, "-d", directory]);
		expect(await readFile(join(directory, "gic-agent/SKILL.md"))).toEqual(
			Buffer.from(expected.skillSource, "utf8"),
		);
		expect(
			await readFile(join(directory, "gic-agent/references/language.md")),
		).toEqual(Buffer.from(expected.referenceSource, "utf8"));
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}
