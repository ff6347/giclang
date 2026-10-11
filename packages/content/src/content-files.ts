// ABOUTME: Discovers repository-authored content for Node-based build tools.
// ABOUTME: Exposes Markdown frontmatter and package-owned URLs for every file.

import { readFile, readdir } from "node:fs/promises";
import matter from "gray-matter";
import { createGicAgentExport } from "./skill-export.ts";
import type { GicAgentExport } from "./skill-export.ts";
import { compileMarkdown } from "./markdown-content.ts";

export type ContentSection = "about" | "docs" | "examples";

export interface GicAgentSkill {
	readonly skillSource: string;
	readonly referenceSource: string;
}

export async function readGicAgentSkill(): Promise<GicAgentSkill> {
	const contentDirectory = new URL(
		"../content/skills/gic-agent/",
		import.meta.resolve("@giclang/content/node"),
	);
	const [skillSource, referenceSource] = await Promise.all([
		readFile(new URL("SKILL.md", contentDirectory), "utf8"),
		readFile(new URL("references/language.md", contentDirectory), "utf8"),
	]);
	return { skillSource, referenceSource };
}

export async function readGicAgentExport(): Promise<GicAgentExport> {
	const contentDirectory = new URL(
		"../content/skills/gic-agent/",
		import.meta.resolve("@giclang/content/node"),
	);
	const [skill, metadataSource, iconSource] = await Promise.all([
		readGicAgentSkill(),
		readFile(new URL("agents/openai.yaml", contentDirectory), "utf8"),
		readFile(new URL("assets/icon.svg", contentDirectory), "utf8"),
	]);
	return createGicAgentExport({ ...skill, metadataSource, iconSource });
}

interface FileEntry {
	readonly path: string;
	readonly fileUrl: URL;
}

export interface MarkdownFile extends FileEntry {
	readonly kind: "markdown";
	readonly frontmatter: Record<string, unknown>;
	readonly body: string;
	readonly source: string;
}

export interface AssetFile extends FileEntry {
	readonly kind: "asset";
}

export type ContentFile = MarkdownFile | AssetFile;

export async function listContentFiles(
	section: ContentSection,
): Promise<ContentFile[]> {
	const files: ContentFile[] = [];

	async function visit(directory: URL, prefix: string): Promise<void> {
		for (const entry of await readdir(directory, { withFileTypes: true })) {
			const path = `${prefix}/${entry.name}`;
			const fileUrl = new URL(
				`${encodeURIComponent(entry.name)}${entry.isDirectory() ? "/" : ""}`,
				directory,
			);
			if (entry.isDirectory()) {
				await visit(fileUrl, path);
			} else if (entry.isFile() && entry.name.endsWith(".md")) {
				const source = await readFile(fileUrl, "utf8");
				compileMarkdown(path, source);
				const { data: frontmatter, content: body } = matter(source);
				files.push({
					kind: "markdown",
					path,
					fileUrl,
					frontmatter,
					body,
					source,
				});
			} else if (entry.isFile()) {
				files.push({ kind: "asset", path, fileUrl });
			}
		}
	}

	await visit(
		new URL(
			`../content/${section}/`,
			import.meta.resolve("@giclang/content/node"),
		),
		section,
	);
	return files.sort((left, right) => left.path.localeCompare(right.path));
}
