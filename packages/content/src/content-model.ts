// ABOUTME: Assembles bundled About, documentation, and example content.
// ABOUTME: Validates stable identifiers and complete example source bundles.

export interface MarkdownContent {
	readonly categories: string[];
	readonly html: string;
	readonly markdown: string;
	readonly order: number;
	readonly tags: string[];
	readonly title: string;
}

export interface ExampleDescription extends MarkdownContent {
	readonly enabled: boolean;
}

export interface DocumentationContent extends MarkdownContent {
	readonly id: string;
}

export interface ExampleContent extends ExampleDescription {
	readonly fileName: string;
	readonly id: string;
	readonly source: string;
	readonly thumbnailUrl: string;
}

export interface ProductContent {
	readonly about: MarkdownContent;
	readonly docs: DocumentationContent[];
	readonly examples: ExampleContent[];
}

interface ProductContentInput {
	readonly about: Record<string, MarkdownContent>;
	readonly docs: Record<string, MarkdownContent>;
	readonly exampleDescriptions: Record<string, ExampleDescription>;
	readonly exampleSources: Record<string, string>;
	readonly exampleThumbnails: Record<string, string>;
}

function ordered<T extends Pick<MarkdownContent, "order" | "title">>(
	entries: readonly T[],
): T[] {
	return entries.toSorted(
		(left, right) =>
			left.order - right.order || left.title.localeCompare(right.title),
	);
}

function requireSingleAbout(
	entries: Record<string, MarkdownContent>,
): MarkdownContent {
	const about = Object.entries(entries);
	if (
		about.length !== 1 ||
		!about[0]?.[0].endsWith("/content/about/index.md")
	) {
		throw new Error("Product content requires 'content/about/index.md'.");
	}
	return about[0][1];
}

function documentationId(path: string): string {
	const marker = "/content/docs/";
	const start = path.indexOf(marker);
	if (start === -1 || !path.endsWith(".md")) {
		throw new Error(`Documentation path '${path}' is invalid.`);
	}
	return path.slice(start + marker.length, -".md".length);
}

function exampleId(path: string): string {
	const match = /\/content\/examples\/([^/]+)\/[^/]+$/.exec(path);
	if (match?.[1] === undefined) {
		throw new Error(`Example path '${path}' is invalid.`);
	}
	return match[1];
}

function byExampleId<T>(entries: Record<string, T>): Map<string, T> {
	const result = new Map<string, T>();
	for (const [path, entry] of Object.entries(entries)) {
		const id = exampleId(path);
		if (result.has(id)) {
			throw new Error(`Example '${id}' contains duplicate content files.`);
		}
		result.set(id, entry);
	}
	return result;
}

export function validateExampleFiles(
	id: string,
	files: ReadonlySet<string>,
): void {
	if (
		files.size !== 3 ||
		!files.has(`${id}.gic`) ||
		!files.has("description.md") ||
		!files.has("thumbnail.png")
	) {
		throw new Error(
			`Example '${id}' requires '${id}.gic', 'description.md', and 'thumbnail.png'.`,
		);
	}
}

export function createProductContent(
	input: ProductContentInput,
): ProductContent {
	const docs = ordered(
		Object.entries(input.docs).map(([path, content]) => ({
			...content,
			id: documentationId(path),
		})),
	);
	return {
		about: requireSingleAbout(input.about),
		docs,
		examples: createExamples(input),
	};
}

export function createExamples(
	input: Pick<
		ProductContentInput,
		"exampleDescriptions" | "exampleSources" | "exampleThumbnails"
	>,
): ExampleContent[] {
	const descriptions = byExampleId(input.exampleDescriptions);
	const sources = byExampleId(input.exampleSources);
	const thumbnails = byExampleId(input.exampleThumbnails);
	const ids = new Set([
		...descriptions.keys(),
		...sources.keys(),
		...thumbnails.keys(),
	]);
	const examples: ExampleContent[] = [];

	for (const id of ids) {
		const description = descriptions.get(id);
		const source = sources.get(id);
		const thumbnailUrl = thumbnails.get(id);
		if (
			description === undefined ||
			source === undefined ||
			thumbnailUrl === undefined
		) {
			throw new Error(
				`Example '${id}' requires '${id}.gic', 'description.md', and 'thumbnail.png'.`,
			);
		}
		if (!description.enabled) {
			continue;
		}
		examples.push({
			...description,
			fileName: `${id}.gic`,
			id,
			source,
			thumbnailUrl,
		});
	}

	return ordered(examples);
}

export function createDocumentationCopyText(
	doc: Pick<MarkdownContent, "title" | "markdown">,
): string {
	return `# ${doc.title}\n\n${doc.markdown}`;
}

export function createDocumentationIndex(
	docs: readonly Pick<DocumentationContent, "id" | "title" | "order">[],
	resolvePageUrl: (id: string) => string,
	fullTextUrl: string,
): string {
	const destination = (url: string) =>
		url
			.replaceAll("&", "&amp;")
			.replace(/[()\s<>\\]/g, (character) =>
				character === "("
					? "%28"
					: character === ")"
						? "%29"
						: encodeURIComponent(character),
			);
	const links = ordered(docs).map((doc) => {
		const title = doc.title
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replace(/[\r\n]+/g, " ")
			.replace(/[\\[\]*_`]/g, "\\$&");
		return `- [${title}](${destination(resolvePageUrl(doc.id))})`;
	});
	return (
		[
			"# GiC",
			"> GiC (Gestalten in Code) is a small language for two-dimensional generative graphics and learning programming.",
			"This index links to complete Markdown documentation. It is not a full-text export. Web access is optional; use the bundled language reference first for syntax and built-in signatures.",
			"## Documentation",
			links.join("\n"),
			"## Optional",
			`- [Complete documentation](${destination(fullTextUrl)})`,
		].join("\n\n") + "\n"
	);
}

export function createDocumentationFullText(
	docs: readonly Pick<
		DocumentationContent,
		"id" | "title" | "order" | "markdown"
	>[],
	resolvePageUrl: (id: string) => string,
): string {
	return (
		"# GiC documentation\n\n" +
		ordered(docs)
			.map((doc) =>
				createDocumentationCopyText({
					title: doc.title,
					markdown: `Source: ${resolvePageUrl(doc.id)}\n\n${doc.markdown}`,
				}),
			)
			.join("\n\n---\n\n")
	);
}

export function createExampleCopyText(
	example: Pick<ExampleContent, "markdown" | "source">,
): string {
	const runs = example.source.match(/`+/g) ?? [];
	const fence = "`".repeat(
		runs.reduce((length, run) => Math.max(length, run.length + 1), 3),
	);
	const ending = example.source.endsWith("\n") ? "" : "\n";
	return `${example.markdown}\n\n${fence}gic\n${example.source}${ending}${fence}\n`;
}
