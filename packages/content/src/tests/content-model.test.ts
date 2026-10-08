// ABOUTME: Verifies trusted Markdown compilation and bundled content assembly.
// ABOUTME: Covers metadata, ordering, example pairing, and embedded raw HTML.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createProductContent,
	type ExampleDescription,
	type MarkdownContent,
} from "../content-model.ts";
import { compileMarkdown } from "../markdown-content.ts";

function page(title: string, order: number): MarkdownContent {
	return {
		categories: [],
		html: `<p>${title}</p>`,
		order,
		tags: [],
		title,
	};
}

function examplePage(
	title: string,
	order: number,
	enabled = true,
): ExampleDescription {
	return {
		...page(title, order),
		enabled,
		markdown: title,
	};
}

describe("Markdown content", () => {
	it("compiles metadata, Markdown, and trusted embedded HTML", () => {
		const content = compileMarkdown(
			"content/docs/repeat.md",
			`---
title: Repeated patterns
order: 20
---

Use **repeat** for a pattern.

<details><summary>More</summary>Nested loops are supported.</details>
`,
		);

		assert.deepEqual(content, {
			categories: [],
			html: `<p>Use <strong>repeat</strong> for a pattern.</p>
<details><summary>More</summary>Nested loops are supported.</details>`,
			order: 20,
			tags: [],
			title: "Repeated patterns",
		});
	});

	it("wraps tables in a keyboard-focusable scrolling region", () => {
		const content = compileMarkdown(
			"content/docs/drawing.md",
			`---
title: Drawing
order: 2
---

| Function | Description |
| --- | --- |
| \`circle(x, y, radius);\` | Draw a circle |
`,
		);

		assert.match(
			content.html,
			/<div class="content-table-scroll" role="region" aria-label="Scrollable table" tabindex="0"><table>/,
		);
		assert.match(content.html, /<\/table>\s*<\/div>/);
	});

	it("resolves relative Markdown images while preserving external image URLs", () => {
		const images: string[] = [];
		const content = compileMarkdown(
			"content/docs/drawing.md",
			`---
title: Drawing
order: 2
---

![Point](./images/drawing/point.png)

![Line](images/drawing/line.png)

![External](https://example.com/example.png)
`,
			(path) => {
				images.push(path);
				return "/assets/point.png";
			},
		);

		assert.deepEqual(images, [
			"./images/drawing/point.png",
			"images/drawing/line.png",
		]);
		assert.match(content.html, /<img src="\/assets\/point.png" alt="Point">/);
		assert.match(
			content.html,
			/<img src="https:\/\/example.com\/example.png" alt="External">/,
		);
	});

	it("rejects incomplete presentation metadata", () => {
		assert.throws(
			() =>
				compileMarkdown(
					"content/docs/repeat.md",
					`---
title: Repeated patterns
---

Missing an order.
`,
				),
			/Content 'content\/docs\/repeat\.md' requires a numeric 'order'\./,
		);
	});

	it("retains example categories and tags for future catalog filtering", () => {
		const content = compileMarkdown(
			"content/examples/repeat/description.md",
			`---
title: Repeated grid
order: 20
categories: [grid, repeat]
tags: [rectangles, nested repetition]
enabled: true
---

Builds a regular rectangle grid.
`,
		);

		assert.deepEqual(content.categories, ["grid", "repeat"]);
		assert.deepEqual(content.tags, ["rectangles", "nested repetition"]);
		assert.equal("enabled" in content && content.enabled, true);
	});

	it("recognizes example descriptions by their package-relative path", () => {
		const content = compileMarkdown(
			"examples/repeat/description.md",
			`---
title: Repeated grid
order: 20
categories: [grid]
tags: [rectangles]
enabled: false
---

Builds a regular rectangle grid.
`,
		);

		assert.deepEqual(content, {
			categories: ["grid"],
			html: "<p>Builds a regular rectangle grid.</p>",
			order: 20,
			tags: ["rectangles"],
			title: "Repeated grid",
			enabled: false,
			markdown: "\nBuilds a regular rectangle grid.\n",
		});
	});

	it("requires example enablement metadata", () => {
		for (const enabled of ["", "enabled: no\n"]) {
			assert.throws(
				() =>
					compileMarkdown(
						"content/examples/repeat/description.md",
						`---
title: Repeated grid
order: 20
categories: [grid]
tags: [rectangles]
${enabled}---

Builds a regular rectangle grid.
`,
					),
				/requires 'enabled' to be a boolean/,
			);
		}
	});

	it("requires example categories and tags", () => {
		assert.throws(
			() =>
				compileMarkdown(
					"content/examples/repeat/description.md",
					`---
title: Repeated grid
order: 20
enabled: true
---

Builds a regular rectangle grid.
`,
				),
			/requires 'categories' to be a list of non-empty strings/,
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
				"../../content/examples/repeat/description.md": examplePage(
					"Repeated grid",
					20,
				),
				"../../content/examples/motif/description.md": examplePage(
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

	it("omits disabled examples from product content", () => {
		const content = createProductContent({
			about: {
				"../../content/about/index.md": page("About", 10),
			},
			docs: {},
			exampleDescriptions: {
				"../../content/examples/repeat/description.md": examplePage(
					"Repeated grid",
					20,
					false,
				),
			},
			exampleSources: {
				"../../content/examples/repeat/repeat.gic": "repeat source",
			},
			exampleThumbnails: {
				"../../content/examples/repeat/thumbnail.png": "/repeat.png",
			},
		});

		assert.deepEqual(content.examples, []);
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
						"../../content/examples/repeat/description.md": examplePage(
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
