// ABOUTME: Verifies build-time discovery of product content and its source files.
// ABOUTME: Exercises nested assets, full Markdown frontmatter, and package-owned file URLs.

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { describe, it } from "node:test";
import matter from "gray-matter";
import { compileMarkdown } from "../markdown-content.ts";
import { listContentFiles, readGicAgentSkill } from "../content-files.ts";

describe("content files", () => {
	it("loads exact canonical skill sources without transforming their metadata", async () => {
		const [skill, expectedSkillSource, expectedReferenceSource] =
			await Promise.all([
				readGicAgentSkill(),
				readFile(
					new URL("../../content/skills/gic-agent/SKILL.md", import.meta.url),
					"utf8",
				),
				readFile(
					new URL(
						"../../content/skills/gic-agent/references/language.md",
						import.meta.url,
					),
					"utf8",
				),
			]);

		assert.equal(skill.skillSource, expectedSkillSource);
		assert.equal(skill.referenceSource, expectedReferenceSource);
	});

	it("finds the About Markdown with its frontmatter and source", async () => {
		const files = await listContentFiles("about");
		const about = files.find((file) => file.path === "about/index.md");
		assert.equal(about?.kind, "markdown");
		if (about?.kind !== "markdown") return;

		assert.deepEqual(about.frontmatter, matter(about.source).data);
		assert.equal(about.body, matter(about.source).content);
		assert.equal(await readFile(about.fileUrl, "utf8"), about.source);
		assert.ok(compileMarkdown(about.path, about.source).html);
	});

	it("finds documentation pages and nested image assets", async () => {
		const files = await listContentFiles("docs");
		const page = files.find((file) => file.kind === "markdown");
		const image = files.find(
			(file) =>
				file.kind === "asset" && /^docs\/images\/.+\.png$/.test(file.path),
		);

		assert.equal(page?.kind, "markdown");
		assert.equal(image?.kind, "asset");
		if (page?.kind !== "markdown" || image?.kind !== "asset") return;

		assert.equal(typeof page.frontmatter["title"], "string");
		const bytes = await readFile(image.fileUrl);
		assert.equal(bytes.subarray(1, 4).toString(), "PNG");
	});

	it("finds example sources, Markdown metadata, and thumbnails regardless of enablement", async () => {
		const files = await listContentFiles("examples");
		const descriptions = files.filter(
			(file) =>
				file.kind === "markdown" && file.path.endsWith("/description.md"),
		);
		const directories = (
			await readdir(new URL("../../content/examples/", import.meta.url), {
				withFileTypes: true,
			})
		).filter((entry) => entry.isDirectory());
		assert.ok(directories.length > 0);
		assert.equal(descriptions.length, directories.length);
		const description = descriptions[0];
		assert.equal(description?.kind, "markdown");
		if (description?.kind !== "markdown") return;
		assert.equal(typeof description.frontmatter["enabled"], "boolean");
		assert.ok(Array.isArray(description.frontmatter["categories"]));
		assert.ok(Array.isArray(description.frontmatter["tags"]));

		const id = description.path.split("/")[1];
		const source = files.find(
			(file) => file.path === `examples/${id}/${id}.gic`,
		);
		const thumbnail = files.find(
			(file) => file.path === `examples/${id}/thumbnail.png`,
		);
		assert.equal(source?.kind, "asset");
		assert.equal(thumbnail?.kind, "asset");
		if (source?.kind !== "asset") return;
		assert.match(await readFile(source.fileUrl, "utf8"), /./);
	});
});
