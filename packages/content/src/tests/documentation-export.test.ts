// ABOUTME: Verifies documentation discovery and complete-text assembly from page fixtures.
// ABOUTME: Pins ordering, source boundaries, escaping, and unmodified full page bodies.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as model from "../content-model.ts";
import MarkdownIt from "markdown-it";

const pages = [
	{
		id: "skill",
		title: "Skill",
		order: 80,
		markdown: "\r\nInstructions.\r\n\r\n## Reference\r\nRead all of it.\r\n",
	},
	{
		id: "drawing",
		title: "Drawing",
		order: 2,
		markdown:
			"\n```gic\ncircle(1, 2, 3);\n```\n\n| A | B |\n| - | - |\n| é | 終 |\n",
	},
	{ id: "colors", title: "Colors", order: 2, markdown: "Colors body.\n" },
	{
		id: "reference",
		title: "Language reference",
		order: 0,
		markdown: "\n[Image](https://giclang.cc/image.png)\n",
	},
];
const ordered = [pages[3]!, pages[2]!, pages[1]!, pages[0]!];
const url = (id: string) => `https://giclang.cc/docs/${id}.md`;

const intro =
	"# GiC\n\n> GiC (Gestalten in Code) is a small language for two-dimensional generative graphics and learning programming.\n\nThis index links to complete Markdown documentation. It is not a full-text export. Web access is optional; use the bundled language reference first for syntax and built-in signatures.\n\n## Documentation\n\n";

describe("documentation exports", () => {
	it("indexes every page once in documentation order with host-owned destinations", () => {
		assert.equal(typeof model.createDocumentationIndex, "function");
		assert.equal(
			model.createDocumentationIndex(
				pages,
				url,
				"https://giclang.cc/llms-full.txt",
			),
			intro +
				ordered.map((page) => `- [${page.title}](${url(page.id)})`).join("\n") +
				"\n\n## Optional\n\n- [Complete documentation](https://giclang.cc/llms-full.txt)\n",
		);
		assert.equal(
			model.createDocumentationIndex(
				pages,
				(id) => `docs/${id}.md`,
				"llms-full.txt",
			),
			intro +
				ordered
					.map((page) => `- [${page.title}](docs/${page.id}.md)`)
					.join("\n") +
				"\n\n## Optional\n\n- [Complete documentation](llms-full.txt)\n",
		);
	});

	it("escapes index labels and destinations without creating links or headings", () => {
		const index = model.createDocumentationIndex(
			[{ id: "nested/one", title: "[A] *B* \\ C\nD", order: 1 }],
			() => "docs/one (é).md",
			"llms-full.txt",
		);
		assert.ok(
			index.includes("- [\\[A\\] \\*B\\* \\\\ C D](docs/one%20%28é%29.md)\n"),
		);
	});

	it("preserves literal HTML and entities in parsed index labels and destinations", () => {
		const title = "<em>Guide</em> &copy;";
		const url = "docs/a&copy;.md";
		const index = model.createDocumentationIndex(
			[{ id: "fixture", title, order: 1 }],
			() => url,
			"llms-full.txt",
		);
		const tokens = new MarkdownIt({ html: true }).parse(index, {});
		const link = tokens.find((token) =>
			token.children?.some((child) => child.type === "link_open"),
		);
		assert.equal(
			link?.children
				?.find((token) => token.type === "link_open")
				?.attrGet("href"),
			url,
		);
		assert.equal(
			link?.children
				?.filter((token) => token.type === "text")
				.map((token) => token.content)
				.join(""),
			title,
		);
		assert.ok(!link?.children?.some((token) => token.type === "html_inline"));
	});

	it("assembles complete pages once without modifying bodies or the caller's array", () => {
		assert.equal(typeof model.createDocumentationFullText, "function");
		const input = structuredClone(pages);
		const expected =
			"# GiC documentation\n\n" +
			ordered
				.map(
					(page) =>
						`# ${page.title}\n\nSource: ${url(page.id)}\n\n${page.markdown}`,
				)
				.join("\n\n---\n\n");
		assert.equal(model.createDocumentationFullText(pages, url), expected);
		assert.deepEqual(pages, input);
	});

	it("preserves empty, whitespace-only, long, and delimiter-containing page bodies", () => {
		for (const markdown of [
			"",
			"\r\n  \r\n",
			"\n---\n# Nested heading\n\n",
			"é 終\r\n".repeat(30_000),
		]) {
			assert.equal(
				model.createDocumentationFullText(
					[{ id: "fixture", title: "Fixture", order: 1, markdown }],
					url,
				),
				`# GiC documentation\n\n# Fixture\n\nSource: ${url("fixture")}\n\n${markdown}`,
			);
		}
	});
});
