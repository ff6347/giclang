// ABOUTME: Verifies exact authored documentation bodies and complete copy text.
// ABOUTME: Covers metadata boundaries, Skill assembly, whitespace, and Unicode.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as model from "../content-model.ts";
import {
	compileMarkdown,
	compileSkillDocumentation,
} from "../markdown-content.ts";

function page(body: string, newline = "\n", start = "---") {
	return [start, "title: Über GIC", "order: 1", "---", ""].join(newline) + body;
}

describe("documentation copying", () => {
	for (const path of ["about/index.md", "docs/fixture.md"]) {
		for (const newline of ["\n", "\r\n"]) {
			it(`preserves the exact body of ${path} with ${JSON.stringify(newline)}`, () => {
				for (const body of [
					"",
					`${newline} ${newline}`,
					`${newline}# こんにちは${newline}${newline}\t**Text**  ${newline}`,
				]) {
					for (const start of ["---", "---yaml", "\uFEFF---yaml"]) {
						const content = compileMarkdown(path, page(body, newline, start));
						assert.equal(content.markdown, body);
					}
				}
			});
		}
	}

	it("uses the same metadata boundary as exact example bodies", () => {
		for (const suffix of ["suffix", " # end metadata"]) {
			const body = `${suffix}\r\n\r\nAuthored body.\r\n`;
			const source = "---yaml\r\ntitle: Boundary\r\norder: 1\r\n---" + body;
			assert.equal(compileMarkdown("docs/fixture.md", source).markdown, body);
		}
		assert.equal(
			compileMarkdown("docs/fixture.md", "---\ntitle: Empty\norder: 1\n")
				.markdown,
			"",
		);
	});

	it("copies the title and entire body without transformations or truncation", () => {
		for (const markdown of [
			"",
			"\r\n  \r\n",
			"[Link](./other.md)\n\n<div>HTML</div>\n\n```gic\npoint(1, 2);\n```\n",
			"終 é\r\n".repeat(20_000),
		]) {
			assert.equal(
				model.createDocumentationCopyText({ title: "Über GIC", markdown }),
				`# Über GIC\n\n${markdown}`,
			);
		}
	});

	it("renders the same complete assembled Skill Markdown that it exposes", () => {
		const guide = "\r\n# Guide\r\n\r\n- Ask **one** question.  \r\n\r\n";
		const instructions =
			"\r\n## Instructions\r\n\r\nRead `references/language.md`.\r\n\r\n```gic\r\npoint(1, 2);\r\n```\r\n\r\n";
		const reference =
			"\r\n# Reference\r\n\r\n| Value | Meaning |\r\n| --- | --- |\r\n| 終 | Complete |\r\n\r\n";
		const content = compileSkillDocumentation(
			"docs/skill.md",
			page(guide, "\r\n"),
			"---\r\nname: fixture\r\ndescription: Private metadata\r\n---\r\n" +
				instructions,
			reference,
		);
		const assembled = [
			guide,
			"## GiC agent skill",
			instructions,
			"## Language reference",
			reference,
		].join("\n\n");
		assert.equal(content.markdown, assembled);
		assert.equal(
			content.html,
			compileMarkdown("docs/assembled.md", page(assembled)).html,
		);
		assert.equal(
			model.createDocumentationCopyText(content),
			`# Über GIC\n\n${assembled}`,
		);
		assert.doesNotMatch(content.markdown, /Private metadata|name: fixture/);
		assert.match(content.markdown, /`references\/language\.md`/);
	});
});
