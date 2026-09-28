// ABOUTME: Discovers repository-authored content for Node-based build tools.
// ABOUTME: Exposes Markdown frontmatter and package-owned URLs for every file.

import { readFile, readdir } from "node:fs/promises";
import matter from "gray-matter";
import { compileMarkdown } from "./markdown-content.ts";

export type ContentSection = "about" | "docs" | "examples";

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

	await visit(new URL(`../content/${section}/`, import.meta.url), section);
	return files.sort((left, right) => left.path.localeCompare(right.path));
}
