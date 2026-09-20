// ABOUTME: Compiles trusted bundled Markdown and validates presentation metadata.
// ABOUTME: Preserves authored HTML for repository-controlled product content.

import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import type { MarkdownContent } from "./content-model.ts";

const markdown = new MarkdownIt({
	html: true,
	linkify: true,
});

function metadataList(
	metadata: Record<string, unknown>,
	name: "categories" | "tags",
	path: string,
	required: boolean,
): string[] {
	const value = metadata[name];
	if (
		!Array.isArray(value) ||
		value.some((entry) => typeof entry !== "string" || entry.trim() === "")
	) {
		if (value === undefined && !required) {
			return [];
		}
		throw new Error(
			`Content '${path}' requires '${name}' to be a list of non-empty strings.`,
		);
	}
	if (required && value.length === 0) {
		throw new Error(`Content '${path}' requires at least one '${name}' entry.`);
	}
	return value.map((entry: string) => entry.trim());
}

export function compileMarkdown(path: string, source: string): MarkdownContent {
	const about = /^<!-- ABOUTME: .+ -->\r?\n<!-- ABOUTME: .+ -->\r?\n/.exec(
		source,
	);
	if (about === null) {
		throw new Error(`Content '${path}' requires two ABOUTME comments.`);
	}
	const parsed = matter(source.slice(about[0].length));
	const metadata: unknown = parsed.data;
	if (
		typeof metadata !== "object" ||
		metadata === null ||
		!("title" in metadata) ||
		typeof metadata.title !== "string" ||
		metadata.title.trim() === ""
	) {
		throw new Error(`Content '${path}' requires a non-empty 'title'.`);
	}
	if (
		!("order" in metadata) ||
		typeof metadata.order !== "number" ||
		!Number.isFinite(metadata.order)
	) {
		throw new Error(`Content '${path}' requires a numeric 'order'.`);
	}
	const normalizedPath = path.replaceAll("\\", "/");
	const isExampleDescription =
		/(?:^|\/)content\/examples\/[^/]+\/description\.md$/.test(normalizedPath);

	return {
		categories: metadataList(
			metadata,
			"categories",
			path,
			isExampleDescription,
		),
		html: markdown.render(parsed.content).trimEnd(),
		order: metadata.order,
		tags: metadataList(metadata, "tags", path, isExampleDescription),
		title: metadata.title.trim(),
	};
}
