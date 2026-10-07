// ABOUTME: Verifies shared skill documentation assembly using isolated fixtures.
// ABOUTME: Ensures authored guidance, skill instructions, and reference all render.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compileSkillDocumentation } from "../markdown-content.ts";

describe("skill documentation", () => {
	it("renders guide metadata, complete skill and reference Markdown, and images", () => {
		const resolvedImages: string[] = [];
		const content = compileSkillDocumentation(
			"docs/skill.md",
			`---
title: Skill
order: 80
categories: [learning]
tags: [assistants]
---

# Using a skill

A skill is reusable instructions.

- Prepare a question.
- Share a sketch.

| Step | Action |
| --- | --- |
| One | Ask |

![Guide image](./guide.png)

![Remote image](https://example.test/image.png)`,
			`---
name: gic-agent
description: Private fixture description
---

## Teaching

Ask one guiding question.

\`\`\`gic
circle(50, 50, 10);
\`\`\``,
			`# Language reference

## Values

Numbers and strings.

## Drawing

\`\`\`gic
point(3, 4);
\`\`\`

| Built-in | Purpose |
| --- | --- |
| point | Draw a point |`,
			(path) => {
				resolvedImages.push(path);
				return "/assets/guide.png";
			},
		);

		assert.equal(content.title, "Skill");
		assert.equal(content.order, 80);
		assert.deepEqual(content.categories, ["learning"]);
		assert.deepEqual(content.tags, ["assistants"]);
		assert.match(content.html, /<h1>Using a skill<\/h1>/);
		assert.match(content.html, /<li>Prepare a question\.<\/li>/);
		assert.match(content.html, /<table>/);
		assert.match(content.html, /circle\(50, 50, 10\);/);
		assert.match(content.html, /point\(3, 4\);/);
		assert.match(content.html, /<h2>Values<\/h2>/);
		assert.match(content.html, /<h2>Drawing<\/h2>/);
		assert.match(
			content.html,
			/<img src="\/assets\/guide.png" alt="Guide image">/,
		);
		assert.match(
			content.html,
			/<img src="https:\/\/example\.test\/image\.png" alt="Remote image">/,
		);
		assert.ok(resolvedImages.length > 0);
		assert.ok(resolvedImages.every((path) => path === "./guide.png"));
		assert.doesNotMatch(
			content.html,
			/Private fixture description|name: gic-agent/,
		);
	});
});
