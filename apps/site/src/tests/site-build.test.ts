// ABOUTME: Verifies the site can prerender package-owned content.
// ABOUTME: Exercises the production bundle where module-relative paths change.

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const site = fileURLToPath(new URL("../../", import.meta.url));
const repository = fileURLToPath(new URL("../../../../", import.meta.url));

test("build prerenders the About content", async () => {
	await promisify(execFile)("pnpm", ["build:site"], {
		cwd: repository,
		timeout: 120_000,
	});
	const html = await readFile(
		new URL("../../dist/index.html", import.meta.url),
		"utf8",
	);
	assert.match(html, /<main>[\s\S]*<\/main>/);

	const skillPage = await readFile(
		new URL("../../dist/docs/skill/index.html", import.meta.url),
		"utf8",
	);
	assert.match(skillPage, /<h1[^>]*>Skill<\/h1>/);
	const skillActions = skillPage.indexOf('aria-label="Skill actions"');
	const skillArticle = skillPage.indexOf("<article");
	assert.ok(skillActions >= 0 && skillActions < skillArticle);
	assert.match(skillPage, /aria-label="Documentation"[\s\S]*?>[\s\S]*?Skill/);
	assert.doesNotMatch(skillPage, /GiC editor agent only/);
	assert.doesNotMatch(
		skillPage,
		/search_reference|read_reference|search_examples/,
	);
	assert.match(skillPage, /<h2>GiC agent skill<\/h2>/);
	assert.match(skillPage, /<h2>Language reference<\/h2>/);
	assert.match(skillPage, />Copy skill and reference</);
	assert.match(skillPage, />Download skill \(ZIP\)</);
	assert.match(skillPage, /aria-label="Skill and language reference text"/);
	assert.match(skillPage, /readonly/);
	assert.match(skillPage, /role="status"/);
	const fallbackStart = skillPage.indexOf("<details");
	const fallbackEnd = skillPage.indexOf("</details>", fallbackStart);
	assert.ok(fallbackStart >= 0 && fallbackEnd > fallbackStart);
	const fallback = skillPage.slice(fallbackStart, fallbackEnd);
	assert.doesNotMatch(fallback, /<details[^>]*\sopen(?:\s|>)/);
	assert.match(
		fallback,
		/<summary[^>]*>Inspect or copy the complete payload<\/summary>/,
	);
	assert.match(fallback, /<label[^>]*for="skill-copy-payload"/);
	assert.match(fallback, /<textarea[^>]*readonly/);
	assert.match(skillPage, /href="\/skills\/gic-agent\.zip"/);
	assert.match(skillPage, /href="\/skills\/gic-agent\/SKILL\.md"/);
	assert.match(
		skillPage,
		/href="\/skills\/gic-agent\/references\/language\.md"/,
	);

	const drawingPage = await readFile(
		new URL("../../dist/docs/drawing/index.html", import.meta.url),
		"utf8",
	);
	assert.doesNotMatch(drawingPage, /Copy skill and reference|Download skill/);
});

test("skill routes publish source files and a ZIP of the exact canonical sources", async () => {
	const archive = new URL("../../dist/skills/gic-agent.zip", import.meta.url);
	const temporaryDirectory = await mkdtemp(`${tmpdir()}/gic-agent-`);

	try {
		const archiveEntries = await promisify(execFile)("unzip", [
			"-Z1",
			fileURLToPath(archive),
		]);
		assert.deepEqual(
			archiveEntries.stdout
				.trim()
				.split("\n")
				.filter((path) => !path.endsWith("/"))
				.sort(),
			["gic-agent/SKILL.md", "gic-agent/references/language.md"],
		);
		await promisify(execFile)("unzip", [
			"-q",
			fileURLToPath(archive),
			"-d",
			temporaryDirectory,
		]);

		const canonicalSkill = await readFile(
			new URL(
				"../../../../packages/content/content/skills/gic-agent/SKILL.md",
				import.meta.url,
			),
			"utf8",
		);
		const canonicalReference = await readFile(
			new URL(
				"../../../../packages/content/content/skills/gic-agent/references/language.md",
				import.meta.url,
			),
			"utf8",
		);
		assert.equal(
			await readFile(`${temporaryDirectory}/gic-agent/SKILL.md`, "utf8"),
			canonicalSkill,
		);
		assert.equal(
			await readFile(
				`${temporaryDirectory}/gic-agent/references/language.md`,
				"utf8",
			),
			canonicalReference,
		);
		assert.equal(
			await readFile(
				new URL("../../dist/skills/gic-agent/SKILL.md", import.meta.url),
				"utf8",
			),
			canonicalSkill,
		);
		assert.equal(
			await readFile(
				new URL(
					"../../dist/skills/gic-agent/references/language.md",
					import.meta.url,
				),
				"utf8",
			),
			canonicalReference,
		);
	} finally {
		await rm(temporaryDirectory, { recursive: true, force: true });
	}
});

test("skill exports resolve beneath a non-root Astro base", async () => {
	const temporaryDirectory = await mkdtemp(`${tmpdir()}/gic-agent-base-`);
	const outputDirectory = join(temporaryDirectory, "dist");
	const extractionDirectory = join(temporaryDirectory, "extracted");

	try {
		await promisify(execFile)(
			"pnpm",
			[
				"exec",
				"astro",
				"build",
				"--base",
				"/workshop/",
				"--outDir",
				outputDirectory,
			],
			{ cwd: site, timeout: 120_000 },
		);

		const skillPage = await readFile(
			join(outputDirectory, "docs/skill/index.html"),
			"utf8",
		);
		const exports = [
			{
				href: "/workshop/skills/gic-agent.zip",
				path: "skills/gic-agent.zip",
			},
			{
				href: "/workshop/skills/gic-agent/SKILL.md",
				path: "skills/gic-agent/SKILL.md",
			},
			{
				href: "/workshop/skills/gic-agent/references/language.md",
				path: "skills/gic-agent/references/language.md",
			},
		];
		for (const { href } of exports) {
			assert.ok(skillPage.includes(`href="${href}"`));
		}

		const canonicalSkill = await readFile(
			new URL(
				"../../../../packages/content/content/skills/gic-agent/SKILL.md",
				import.meta.url,
			),
			"utf8",
		);
		const canonicalReference = await readFile(
			new URL(
				"../../../../packages/content/content/skills/gic-agent/references/language.md",
				import.meta.url,
			),
			"utf8",
		);
		assert.equal(
			await readFile(join(outputDirectory, exports[1].path), "utf8"),
			canonicalSkill,
		);
		assert.equal(
			await readFile(join(outputDirectory, exports[2].path), "utf8"),
			canonicalReference,
		);

		const archive = join(outputDirectory, exports[0].path);
		const archiveEntries = await promisify(execFile)("unzip", ["-Z1", archive]);
		assert.deepEqual(archiveEntries.stdout.trim().split("\n").sort(), [
			"gic-agent/SKILL.md",
			"gic-agent/references/language.md",
		]);
		await mkdir(extractionDirectory);
		await promisify(execFile)("unzip", [
			"-q",
			archive,
			"-d",
			extractionDirectory,
		]);
		assert.equal(
			await readFile(join(extractionDirectory, "gic-agent/SKILL.md"), "utf8"),
			canonicalSkill,
		);
		assert.equal(
			await readFile(
				join(extractionDirectory, "gic-agent/references/language.md"),
				"utf8",
			),
			canonicalReference,
		);
	} finally {
		await rm(temporaryDirectory, { recursive: true, force: true });
	}
});

test("documentation images resolve to emitted package assets", async () => {
	const page = new URL("../../dist/docs/drawing/index.html", import.meta.url);
	const html = await readFile(page, "utf8");
	const images = [...html.matchAll(/<img\b[^>]*src="([^"]+)"/g)];
	assert.equal(images.length, 9);
	for (const [, source] of images) {
		const url = new URL(source, "https://gic.example/docs/drawing/");
		const bytes = await readFile(
			new URL(`../../dist${url.pathname}`, import.meta.url),
		);
		assert.equal(bytes.subarray(1, 4).toString(), "PNG");
	}
});
