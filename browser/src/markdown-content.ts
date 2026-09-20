// ABOUTME: Compiles trusted bundled Markdown and validates presentation metadata.
// ABOUTME: Preserves authored HTML for repository-controlled product content.

import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import type { MarkdownContent } from "./content-model.ts";

const markdown = new MarkdownIt({
	html: true,
	linkify: true,
});

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

	return {
		html: markdown.render(parsed.content).trimEnd(),
		order: metadata.order,
		title: metadata.title.trim(),
	};
}
