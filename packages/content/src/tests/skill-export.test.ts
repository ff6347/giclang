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
const startInstruction =
	"Paste the skill and language reference below into your assistant. Then send your sketch or diagnostic and ask for one next step.";
const referenceSource =
	'# Reference Ω\r\n\r\n## Values\r\n\r\n```gic\r\nprint("こんにちは");\r\n```\r\n\r\n' +
	"Reference end marker.\r\n";

async function extractArchive(archiveBase64: string): Promise<{
	files: string[];
	skillBytes: Buffer;
	referenceBytes: Buffer;
}> {
	const directory = await mkdtemp(join(tmpdir(), "gic-agent-export-"));
	const archivePath = join(directory, "gic-agent.zip");
	try {
		await writeFile(archivePath, Buffer.from(archiveBase64, "base64"));
		const listing = execFileSync("unzip", ["-Z1", archivePath], {
			encoding: "utf8",
		});
		execFileSync("unzip", ["-q", archivePath, "-d", directory]);
		return {
			files: listing.trimEnd().split("\n").sort(),
			skillBytes: await readFile(join(directory, "gic-agent/SKILL.md")),
			referenceBytes: await readFile(
				join(directory, "gic-agent/references/language.md"),
			),
		};
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}

describe("GiC agent export", () => {
	it("returns the raw source and assembles the complete frontmatter-free copy text", () => {
		const result = createGicAgentExport({ skillSource, referenceSource });

		assert.equal(result.skillSource, skillSource);
		assert.equal(result.referenceSource, referenceSource);
		assert.ok(result.copyText.startsWith(startInstruction));
		assert.ok(result.copyText.includes(skillBody));
		assert.ok(result.copyText.endsWith(referenceSource));
		assert.ok(!result.copyText.includes("name: fixture"));
		assert.ok(!result.copyText.includes("description: fixture skill"));
		assert.equal(
			result.copyText,
			[
				startInstruction,
				"--- Skill instructions ---",
				skillBody,
				"--- Language reference ---",
				referenceSource,
			].join("\n\n"),
		);
	});

	it("keeps source text without frontmatter unchanged", () => {
		const skillSource = "# No frontmatter\n\nKeep this complete body.\n";
		const result = createGicAgentExport({ skillSource, referenceSource });

		assert.equal(result.skillSource, skillSource);
		assert.equal(
			result.copyText,
			[
				startInstruction,
				"--- Skill instructions ---",
				skillSource,
				"--- Language reference ---",
				referenceSource,
			].join("\n\n"),
		);
	});

	it("keeps an empty LF-frontmatter source unchanged", () => {
		const skillSource = "---\nname: empty\n---";
		const result = createGicAgentExport({ skillSource, referenceSource });

		assert.equal(result.skillSource, skillSource);
		assert.ok(!result.copyText.includes("name: empty"));
		assert.equal(
			result.copyText,
			[
				startInstruction,
				"--- Skill instructions ---",
				"",
				"--- Language reference ---",
				referenceSource,
			].join("\n\n"),
		);
	});

	it("keeps an empty CRLF-frontmatter source unchanged", () => {
		const skillSource = "---\r\nname: empty\r\n---";
		const result = createGicAgentExport({ skillSource, referenceSource });

		assert.equal(result.skillSource, skillSource);
		assert.ok(!result.copyText.includes("name: empty"));
		assert.equal(
			result.copyText,
			[
				startInstruction,
				"--- Skill instructions ---",
				"",
				"--- Language reference ---",
				referenceSource,
			].join("\n\n"),
		);
	});

	it("contains exactly the original source pair at their portable paths", async () => {
		const result = createGicAgentExport({ skillSource, referenceSource });
		const extracted = await extractArchive(result.archiveBase64);

		assert.deepEqual(extracted.files, [
			"gic-agent/SKILL.md",
			"gic-agent/references/language.md",
		]);
		assert.deepEqual(extracted.skillBytes, Buffer.from(skillSource, "utf8"));
		assert.deepEqual(
			extracted.referenceBytes,
			Buffer.from(referenceSource, "utf8"),
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
			]),
			readGicAgentExport(),
		]);
		const [expectedSkillSource, expectedReferenceSource] = rawSources;

		assert.equal(canonical.skillSource, expectedSkillSource);
		assert.equal(canonical.referenceSource, expectedReferenceSource);
		assert.equal(result.skillSource, expectedSkillSource);
		assert.equal(result.referenceSource, expectedReferenceSource);
		assert.equal(
			result.copyText,
			[
				startInstruction,
				"--- Skill instructions ---",
				`\n${matter(expectedSkillSource).content}`,
				"--- Language reference ---",
				expectedReferenceSource,
			].join("\n\n"),
		);

		const extracted = await extractArchive(result.archiveBase64);
		assert.deepEqual(
			extracted.skillBytes,
			Buffer.from(expectedSkillSource, "utf8"),
		);
		assert.deepEqual(
			extracted.referenceBytes,
			Buffer.from(expectedReferenceSource, "utf8"),
		);
	});
});
