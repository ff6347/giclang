// ABOUTME: Verifies website documentation destinations against canonical publication paths.
// ABOUTME: Covers normalized nested identities and portable Markdown without altering code.

import assert from "node:assert/strict";
import { test } from "node:test";

const documents = new Set([
	"docs/colors.md",
	"docs/colors-named.md",
	"docs/lessons/start.md",
]);

test("resolves copied documentation destinations from the source identity, not a deployment base", async () => {
	const { createDocumentationLinkResolver } =
		await import("../lib/documentation-links.ts");
	const resolve = createDocumentationLinkResolver(
		"docs/lessons/start.md",
		documents,
	);
	for (const [href, expected] of [
		["../colors.md", "https://giclang.cc/docs/colors.md"],
		[
			".././colors-named.md?mode=read#names",
			"https://giclang.cc/docs/colors-named.md?mode=read#names",
		],
		["./start.md#intro", "https://giclang.cc/docs/lessons/start.md#intro"],
		["#intro", "https://giclang.cc/docs/lessons/start.md#intro"],
		[
			"?mode=read#intro",
			"https://giclang.cc/docs/lessons/start.md?mode=read#intro",
		],
		[
			"../images/drawing/../drawing/point.png",
			"https://giclang.cc/docs-assets/docs/images/drawing/point.png",
		],
		[
			"../images/a%20b.png?size=2#pixel",
			"https://giclang.cc/docs-assets/docs/images/a%20b.png?size=2#pixel",
		],
		["/docs/colors.md#colors", "https://giclang.cc/docs/colors.md#colors"],
		[
			"/docs-assets/docs/images/drawing/point.png",
			"https://giclang.cc/docs-assets/docs/images/drawing/point.png",
		],
		["/skills/gic-agent.zip", "https://giclang.cc/skills/gic-agent.zip"],
		["https://other.example/guide#intro", "https://other.example/guide#intro"],
		["//other.example/image.png", "//other.example/image.png"],
		["mailto:learner@example.org", "mailto:learner@example.org"],
		["data:image/png;base64,abc", "data:image/png;base64,abc"],
	]) {
		assert.equal(resolve(href), expected, href);
	}
});

test("portable build Markdown changes real destinations but preserves learner text and code", async () => {
	const { createDocumentationLinkResolver } =
		await import("../lib/documentation-links.ts");
	const { portableMarkdown } = await import("@giclang/content/markdown");
	const source = [
		"  Authored spacing.  ",
		"[Colors](../colors.md#names) and ![Point](../images/drawing/point.png)",
		"[Reference][colors]",
		"",
		'[colors]: ../colors.md "Color guide"',
		'<a href="/docs/colors.md">HTML link</a>',
		"[Fragment](#intro)",
		"[External](https://other.example/guide)",
		"`[Code](../colors.md)`",
		"```gic",
		"// [Code](../colors.md)",
		"```",
		"",
	].join("\n");
	const expected = source
		.replace(
			"(../colors.md#names)",
			"(https://giclang.cc/docs/colors.md#names)",
		)
		.replace(
			"(../images/drawing/point.png)",
			"(https://giclang.cc/docs-assets/docs/images/drawing/point.png)",
		)
		.replace(
			"[colors]: ../colors.md",
			"[colors]: https://giclang.cc/docs/colors.md",
		)
		.replace(
			'href="/docs/colors.md"',
			'href="https://giclang.cc/docs/colors.md"',
		)
		.replace("(#intro)", "(https://giclang.cc/docs/lessons/start.md#intro)");
	assert.equal(
		portableMarkdown(
			source,
			createDocumentationLinkResolver("docs/lessons/start.md", documents),
		),
		expected,
	);
});
