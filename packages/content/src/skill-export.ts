// ABOUTME: Assembles the portable GiC skill payload and source archive at build time.
// ABOUTME: Keeps authored Markdown intact while exposing copy-ready text and ZIP data.

import { Buffer } from "node:buffer";
import { zipSync, strToU8 } from "fflate";
import matter from "gray-matter";

export interface GicAgentExportInput {
	readonly skillSource: string;
	readonly referenceSource: string;
}

export interface GicAgentExport {
	readonly copyText: string;
	readonly skillSource: string;
	readonly referenceSource: string;
	readonly archiveBase64: string;
}

export function createGicAgentExport({
	skillSource,
	referenceSource,
}: GicAgentExportInput): GicAgentExport {
	const parsedSkill = matter(skillSource);
	const closingDelimiter = /^---[ \t]*(?=\r?$)/gm;
	closingDelimiter.lastIndex = skillSource.indexOf("\n") + 1;
	const closingMatch = closingDelimiter.exec(skillSource);
	const skillBody =
		parsedSkill.content === skillSource || !closingMatch
			? parsedSkill.content
			: skillSource.slice(closingMatch.index + closingMatch[0].length);
	const copyText = [
		"Paste the skill and language reference below into your assistant. Then send your sketch or diagnostic and ask for one next step.",
		"--- Skill instructions ---",
		skillBody,
		"--- Language reference ---",
		referenceSource,
	].join("\n\n");
	const archive = zipSync(
		{
			"gic-agent/SKILL.md": strToU8(skillSource),
			"gic-agent/references/language.md": strToU8(referenceSource),
		},
		{ mtime: new Date(1980, 0, 1) },
	);

	return {
		copyText,
		skillSource,
		referenceSource,
		archiveBase64: Buffer.from(archive).toString("base64"),
	};
}
