// ABOUTME: Assembles the portable GiC source text and archive at build time.
// ABOUTME: Preserves the complete authored sources in plain text and ZIP data.

import { Buffer } from "node:buffer";
import { zipSync, strToU8 } from "fflate";

export interface GicAgentExportInput {
	readonly skillSource: string;
	readonly referenceSource: string;
	readonly metadataSource: string;
	readonly iconSource: string;
}

export interface GicAgentExport {
	readonly rawText: string;
	readonly skillSource: string;
	readonly referenceSource: string;
	readonly metadataSource: string;
	readonly iconSource: string;
	readonly archiveBase64: string;
}

export function createGicAgentExport({
	skillSource,
	referenceSource,
	metadataSource,
	iconSource,
}: GicAgentExportInput): GicAgentExport {
	const rawText = [
		skillSource,
		"--- gic-agent/references/language.md ---",
		referenceSource,
	].join("\n\n");
	const archive = zipSync(
		{
			"gic-agent/SKILL.md": strToU8(skillSource),
			"gic-agent/references/language.md": strToU8(referenceSource),
			"gic-agent/agents/openai.yaml": strToU8(metadataSource),
			"gic-agent/assets/icon.svg": strToU8(iconSource),
		},
		{ mtime: new Date(1980, 0, 1) },
	);

	return {
		rawText,
		skillSource,
		referenceSource,
		metadataSource,
		iconSource,
		archiveBase64: Buffer.from(archive).toString("base64"),
	};
}
