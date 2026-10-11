// ABOUTME: Verifies bounded GiC skill assembly and portable ZIP export.
// ABOUTME: Checks exact source preservation through independently extracted archives.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import matter from "gray-matter";
import { readGicAgentSkill, readGicAgentExport } from "../content-files.ts";
import { createGicAgentExport } from "../skill-export.ts";

const skillBody =
	"\r\n# Skill λ\r\n\r\nA retained paragraph.\r\n\r\n```gic\r\npoint(1, 2);\r\n```\r\n\r\n---\r\n\r\n  \r\n" +
	"This final skill text must not be truncated: " +
	"技能を保持する。".repeat(2_000) +
	"\r\n";
const skillSource = `---\r\nname: fixture\r\ndescription: fixture skill\r\n---${skillBody}`;
const referenceSource =
	'# Reference Ω\r\n\r\n## Values\r\n\r\n```gic\r\nprint("こんにちは");\r\n```\r\n\r\n' +
	"Reference end marker.\r\n";
const metadataSource = "name: fixture metadata\ndescription: retained\n";
const iconSource =
	'<svg xmlns="http://www.w3.org/2000/svg"><title>λ</title></svg>\n';

async function extractArchive(archiveBase64: string): Promise<{
	files: string[];
	sources: Map<string, Buffer>;
}> {
	const directory = await mkdtemp(join(tmpdir(), "gic-agent-export-"));
	const archivePath = join(directory, "gic-agent.zip");
	try {
		await writeFile(archivePath, Buffer.from(archiveBase64, "base64"));
		const listing = execFileSync("unzip", ["-Z1", archivePath], {
			encoding: "utf8",
		});
		execFileSync("unzip", ["-q", archivePath, "-d", directory]);
		const files = listing.trimEnd().split("\n").sort();
		const sources = new Map<string, Buffer>();
		for (const file of files) {
			sources.set(file, await readFile(join(directory, file)));
		}
		return { files, sources };
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}

describe("GiC agent export", () => {
	it("assembles exact raw text from complete source files", () => {
		const result = createGicAgentExport({
			skillSource,
			referenceSource,
			metadataSource,
			iconSource,
		});

		assert.equal(result.skillSource, skillSource);
		assert.equal(result.referenceSource, referenceSource);
		assert.equal(result.metadataSource, metadataSource);
		assert.equal(result.iconSource, iconSource);
		assert.deepEqual(matter(result.rawText).data, {
			name: "fixture",
			description: "fixture skill",
		});
		assert.equal(
			result.rawText,
			[
				skillSource,
				"--- gic-agent/references/language.md ---",
				referenceSource,
			].join("\n\n"),
		);
	});

	it("contains exactly all four sources at their portable paths deterministically", async () => {
		const input = { skillSource, referenceSource, metadataSource, iconSource };
		const result = createGicAgentExport(input);
		const extracted = await extractArchive(result.archiveBase64);

		assert.deepEqual(extracted.files, [
			"gic-agent/SKILL.md",
			"gic-agent/agents/openai.yaml",
			"gic-agent/assets/icon.svg",
			"gic-agent/references/language.md",
		]);
		assert.deepEqual(
			extracted.sources.get("gic-agent/SKILL.md"),
			Buffer.from(skillSource, "utf8"),
		);
		assert.deepEqual(
			extracted.sources.get("gic-agent/references/language.md"),
			Buffer.from(referenceSource, "utf8"),
		);
		assert.deepEqual(
			extracted.sources.get("gic-agent/agents/openai.yaml"),
			Buffer.from(metadataSource, "utf8"),
		);
		assert.deepEqual(
			extracted.sources.get("gic-agent/assets/icon.svg"),
			Buffer.from(iconSource, "utf8"),
		);
		assert.equal(
			createGicAgentExport(input).archiveBase64,
			result.archiveBase64,
		);
	});

	it("loads the canonical source pair through the shared build-time reader", async () => {
		const [canonical, rawSources, result] = await Promise.all([
			readGicAgentSkill(),
			Promise.all([
				readFile(
					new URL("../../content/skills/gic-agent/SKILL.md", import.meta.url),
					"utf8",
				),
				readFile(
					new URL(
						"../../content/skills/gic-agent/references/language.md",
						import.meta.url,
					),
					"utf8",
				),
				readFile(
					new URL(
						"../../content/skills/gic-agent/agents/openai.yaml",
						import.meta.url,
					),
					"utf8",
				),
				readFile(
					new URL(
						"../../content/skills/gic-agent/assets/icon.svg",
						import.meta.url,
					),
					"utf8",
				),
			]),
			readGicAgentExport(),
		]);
		const [
			expectedSkillSource,
			expectedReferenceSource,
			expectedMetadataSource,
			expectedIconSource,
		] = rawSources;

		assert.equal(canonical.skillSource, expectedSkillSource);
		assert.equal(canonical.referenceSource, expectedReferenceSource);
		assert.equal(result.skillSource, expectedSkillSource);
		assert.equal(result.referenceSource, expectedReferenceSource);
		assert.equal(result.metadataSource, expectedMetadataSource);
		assert.equal(result.iconSource, expectedIconSource);
		assert.equal(
			result.rawText,
			[
				expectedSkillSource,
				"--- gic-agent/references/language.md ---",
				expectedReferenceSource,
			].join("\n\n"),
		);

		const extracted = await extractArchive(result.archiveBase64);
		assert.deepEqual(
			extracted.sources.get("gic-agent/SKILL.md"),
			Buffer.from(expectedSkillSource, "utf8"),
		);
		assert.deepEqual(
			extracted.sources.get("gic-agent/references/language.md"),
			Buffer.from(expectedReferenceSource, "utf8"),
		);
		assert.deepEqual(
			extracted.sources.get("gic-agent/agents/openai.yaml"),
			Buffer.from(expectedMetadataSource, "utf8"),
		);
		assert.deepEqual(
			extracted.sources.get("gic-agent/assets/icon.svg"),
			Buffer.from(expectedIconSource, "utf8"),
		);
	});
});
