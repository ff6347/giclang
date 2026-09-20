// ABOUTME: Imports repository-authored product content through Vite's asset graph.
// ABOUTME: Exposes validated About, documentation, and example records to React.

import { createProductContent, type MarkdownContent } from "./content-model.ts";

const about = import.meta.glob<MarkdownContent>(
	"../../content/about/index.md",
	{
		eager: true,
		import: "default",
	},
);
const docs = import.meta.glob<MarkdownContent>("../../content/docs/**/*.md", {
	eager: true,
	import: "default",
});
const exampleDescriptions = import.meta.glob<MarkdownContent>(
	"../../content/examples/*/description.md",
	{
		eager: true,
		import: "default",
	},
);
const exampleSources = import.meta.glob<string>(
	"../../content/examples/*/*.gic",
	{
		eager: true,
		import: "default",
		query: "?raw",
	},
);
const exampleThumbnails = import.meta.glob<string>(
	"../../content/examples/*/thumbnail.png",
	{
		eager: true,
		import: "default",
		query: "?url",
	},
);

export const productContent = createProductContent({
	about,
	docs,
	exampleDescriptions,
	exampleSources,
	exampleThumbnails,
});
