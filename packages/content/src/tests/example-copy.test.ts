// ABOUTME: Verifies complete authored example text for portable clipboard use.
// ABOUTME: Covers body whitespace, line endings, Unicode, fences, and long source.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createExampleCopyText, createExamples } from "../content-model.ts";
import { compileMarkdown } from "../markdown-content.ts";

function description(body: string, newline = "\n") {
	const source =
		[
			"---",
			"title: Fixture",
			"order: 1",
			"categories: [drawing]",
			"tags: [circles]",
			"enabled: true",
			"---",
			"",
		].join(newline) + body;
	const compiled = compileMarkdown(
		"content/examples/fixture/description.md",
		source,
	);
	assert.ok("markdown" in compiled);
	return compiled;
}

describe("example copying", () => {
	it("preserves authored Markdown and exact code instead of rendered HTML or metadata", () => {
		const markdown =
			"\n\n# Über círculos\n\nUse **small** circles.\n\n```gic\ncircle(1, 2, 3);\n```\n";
		const compiled = description(markdown);
		assert.equal(compiled.markdown, markdown);
		const source = 'print("こんにちは");\ncircle(50, 50, 10);\n';
		assert.equal(
			createExampleCopyText({ ...compiled, source }),
			`${markdown}\n\n\`\`\`gic\n${source}\`\`\`\n`,
		);
	});

	it("retains CRLF, empty bodies, and source without a final line ending", () => {
		for (const markdown of [
			"",
			"\r\n \r\n",
			"\r\n\r\nDescribe **this**.\r\n",
		]) {
			const compiled = description(markdown, "\r\n");
			assert.equal(compiled.markdown, markdown);
			const source = 'print("a");\r\nprint("b");';
			assert.equal(
				createExampleCopyText({ ...compiled, source }),
				`${markdown}\n\n\`\`\`gic\n${source}\n\`\`\`\n`,
			);
		}
	});

	it("excludes accepted BOM and language-tagged frontmatter without trimming the body", () => {
		const markdown = "\r\n\r\nAuthored **body**.\r\n";
		const header =
			"\r\ntitle: Fixture\r\norder: 1\r\ncategories: [drawing]\r\ntags: [circles]\r\nenabled: true\r\n---\r\n";
		for (const start of ["\uFEFF---", "---yaml", "\uFEFF---yaml"]) {
			const compiled = compileMarkdown(
				"examples/fixture/description.md",
				start + header + markdown,
			);
			assert.ok("markdown" in compiled);
			assert.equal(compiled.markdown, markdown);
			assert.equal(
				createExampleCopyText({ ...compiled, source: "point(1, 2);" }),
				`${markdown}\n\n\`\`\`gic\npoint(1, 2);\n\`\`\`\n`,
			);
		}
	});

	it("uses the metadata parser's closing boundary without leaking metadata", () => {
		const header =
			"---yaml\r\ntitle: Fixture\r\norder: 1\r\ncategories: [drawing]\r\ntags: [circles]\r\nenabled: true\r\n";
		for (const suffix of [" # end metadata", "suffix"]) {
			const markdown = `${suffix}\r\n\r\nAuthored body.\r\n`;
			const compiled = compileMarkdown(
				"examples/fixture/description.md",
				header + "---" + markdown,
			);
			assert.ok("markdown" in compiled);
			assert.equal(compiled.markdown, markdown);
		}
		const withoutBody = compileMarkdown(
			"examples/fixture/description.md",
			header,
		);
		assert.ok("markdown" in withoutBody);
		assert.equal(withoutBody.markdown, "");
	});

	it("uses a fence that cannot be closed by the bundled source", () => {
		const source = '// ```\n// `````\nprint("fences");\n';
		assert.equal(
			createExampleCopyText({ markdown: "Description", source }),
			`Description\n\n\`\`\`\`\`\`gic\n${source}\`\`\`\`\`\`\n`,
		);
	});

	it("does not truncate long description or source content", () => {
		const markdown = "Long description é.\n".repeat(20_000);
		const source = 'print("終");\n'.repeat(20_000);
		assert.equal(
			createExampleCopyText({ markdown, source }),
			`${markdown}\n\n\`\`\`gic\n${source}\`\`\`\n`,
		);
	});

	it("assembles standalone examples with the same body, source, and enablement", () => {
		const compiled = description("\nAuthored description.\n");
		const examples = createExamples({
			exampleDescriptions: {
				"/content/examples/fixture/description.md": compiled,
			},
			exampleSources: {
				"/content/examples/fixture/fixture.gic": "point(1, 2);",
			},
			exampleThumbnails: {
				"/content/examples/fixture/thumbnail.png": "/fixture.png",
			},
		});
		assert.deepEqual(examples, [
			{
				...compiled,
				id: "fixture",
				fileName: "fixture.gic",
				source: "point(1, 2);",
				thumbnailUrl: "/fixture.png",
			},
		]);
		assert.deepEqual(
			createExamples({
				exampleDescriptions: {
					"/content/examples/fixture/description.md": {
						...compiled,
						enabled: false,
					},
				},
				exampleSources: {
					"/content/examples/fixture/fixture.gic": "point(1, 2);",
				},
				exampleThumbnails: {
					"/content/examples/fixture/thumbnail.png": "/fixture.png",
				},
			}),
			[],
		);
	});
});
