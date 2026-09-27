// ABOUTME: Imports repository-authored product content through Vite's asset graph.
// ABOUTME: Exposes validated About, documentation, and example records to React.

import {
	createProductContent,
	type ExampleDescription,
	type MarkdownContent,
} from "@giclang/content/model";

const about = import.meta.glob<MarkdownContent>(
	"../../../../packages/content/content/about/index.md",
	{
		eager: true,
		import: "default",
	},
);
const docs = import.meta.glob<MarkdownContent>(
	"../../../../packages/content/content/docs/**/*.md",
	{
		eager: true,
		import: "default",
	},
);
const exampleDescriptions = import.meta.glob<ExampleDescription>(
	"../../../../packages/content/content/examples/*/description.md",
	{
		eager: true,
		import: "default",
	},
);
const exampleSources = import.meta.glob<string>(
	"../../../../packages/content/content/examples/*/*.gic",
	{
		eager: true,
		import: "default",
		query: "?raw",
	},
);
const exampleThumbnails = import.meta.glob<string>(
	"../../../../packages/content/content/examples/*/thumbnail.png",
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
