// ABOUTME: Verifies trusted Markdown compilation and bundled content assembly.
// ABOUTME: Covers metadata, ordering, example pairing, and embedded raw HTML.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createProductContent, type MarkdownContent } from "./content-model.ts";
import { compileMarkdown } from "./markdown-content.ts";

function page(title: string, order: number): MarkdownContent {
	return {
		html: `<p>${title}</p>`,
		order,
		title,
	};
}

describe("Markdown content", () => {
	it("compiles metadata, Markdown, and trusted embedded HTML", () => {
		const content = compileMarkdown(
			"content/docs/repeat.md",
			`<!-- ABOUTME: Explains repeated patterns in GIC sketches. -->
<!-- ABOUTME: Introduces nested loops through one focused example. -->
---
title: Repeated patterns
order: 20
---

Use **repeat** for a pattern.

<details><summary>More</summary>Nested loops are supported.</details>
`,
		);

		assert.deepEqual(content, {
			html: `<p>Use <strong>repeat</strong> for a pattern.</p>
<details><summary>More</summary>Nested loops are supported.</details>`,
			order: 20,
			title: "Repeated patterns",
		});
	});

	it("rejects incomplete presentation metadata", () => {
		assert.throws(
			() =>
				compileMarkdown(
					"content/docs/repeat.md",
					`<!-- ABOUTME: Explains repeated patterns in GIC sketches. -->
<!-- ABOUTME: Introduces nested loops through one focused example. -->
---
title: Repeated patterns
---

Missing an order.
`,
				),
			/Content 'content\/docs\/repeat\.md' requires a numeric 'order'\./,
		);
	});
});

describe("product content", () => {
	it("pairs and orders documentation and examples by their stable identifiers", () => {
		const content = createProductContent({
			about: {
				"../../content/about/index.md": page("About", 10),
			},
			docs: {
				"../../content/docs/repeat.md": page("Repeated patterns", 20),
				"../../content/docs/drawing.md": page("Drawing", 10),
			},
			exampleDescriptions: {
				"../../content/examples/repeat/description.md": page(
					"Repeated grid",
					20,
				),
				"../../content/examples/motif/description.md": page(
					"Reusable motif",
					10,
				),
			},
			exampleSources: {
				"../../content/examples/repeat/repeat.gic": "repeat source",
				"../../content/examples/motif/motif.gic": "motif source",
			},
			exampleThumbnails: {
				"../../content/examples/repeat/thumbnail.png": "/repeat.png",
				"../../content/examples/motif/thumbnail.png": "/motif.png",
			},
		});

		assert.equal(content.about.title, "About");
		assert.deepEqual(
			content.docs.map(({ id, title }) => ({ id, title })),
			[
				{ id: "drawing", title: "Drawing" },
				{ id: "repeat", title: "Repeated patterns" },
			],
		);
		assert.deepEqual(
			content.examples.map(({ fileName, id, title }) => ({
				fileName,
				id,
				title,
			})),
			[
				{
					fileName: "motif.gic",
					id: "motif",
					title: "Reusable motif",
				},
				{
					fileName: "repeat.gic",
					id: "repeat",
					title: "Repeated grid",
				},
			],
		);
		assert.equal(content.examples[0]?.source, "motif source");
		assert.equal(content.examples[0]?.thumbnailUrl, "/motif.png");
	});

	it("rejects an incomplete example folder", () => {
		assert.throws(
			() =>
				createProductContent({
					about: {
						"../../content/about/index.md": page("About", 10),
					},
					docs: {},
					exampleDescriptions: {
						"../../content/examples/repeat/description.md": page(
							"Repeated grid",
							20,
						),
					},
					exampleSources: {
						"../../content/examples/repeat/repeat.gic": "repeat source",
					},
					exampleThumbnails: {},
				}),
			/Example 'repeat' requires 'repeat\.gic', 'description\.md', and 'thumbnail\.png'\./,
		);
	});
});
