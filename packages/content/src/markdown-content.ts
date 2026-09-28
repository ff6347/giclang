// ABOUTME: Compiles trusted bundled Markdown and validates presentation metadata.
// ABOUTME: Preserves authored HTML for repository-controlled product content.

import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import type { ExampleDescription, MarkdownContent } from "./content-model.ts";

const markdown = new MarkdownIt({
	html: true,
	linkify: true,
});
const defaultLinkOpen = markdown.renderer.rules.link_open;
const defaultImage = markdown.renderer.rules.image;

markdown.renderer.rules.image = (tokens, idx, options, env, self) => {
	const token = tokens[idx];
	const source = token?.attrGet("src");
	const resolveImage = (env as { resolveImage?: (path: string) => string })
		.resolveImage;
	if (
		token &&
		typeof source === "string" &&
		!/^(?:[a-z][a-z\d+.-]*:|\/|#|\?)/i.test(source) &&
		resolveImage
	) {
		token.attrSet("src", resolveImage(source));
	}
	return defaultImage
		? defaultImage(tokens, idx, options, env, self)
		: self.renderToken(tokens, idx, options);
};

markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
	const token = tokens[idx];

	if (!token) return self.renderToken(tokens, idx, options);
	token.attrSet("target", "_blank");
	token.attrJoin("rel", "noopener noreferrer"); // Secure new-tab links.

	return defaultLinkOpen
		? defaultLinkOpen(tokens, idx, options, env, self)
		: self.renderToken(tokens, idx, options);
};

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

export function compileMarkdown(
	path: string,
	source: string,
	resolveImage?: (path: string) => string,
): ExampleDescription | MarkdownContent {
	const parsed = matter(source);
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
	const isExampleDescription = /(?:^|\/)examples\/[^/]+\/description\.md$/.test(
		normalizedPath,
	);

	const content: MarkdownContent = {
		categories: metadataList(
			metadata,
			"categories",
			path,
			isExampleDescription,
		),
		html: markdown.render(parsed.content, { resolveImage }).trimEnd(),
		order: metadata.order,
		tags: metadataList(metadata, "tags", path, isExampleDescription),
		title: metadata.title.trim(),
	};
	if (!isExampleDescription) {
		return content;
	}
	if (!("enabled" in metadata) || typeof metadata.enabled !== "boolean") {
		throw new Error(`Content '${path}' requires 'enabled' to be a boolean.`);
	}
	return {
		...content,
		enabled: metadata.enabled,
	};
}
