// ABOUTME: Verifies the site can prerender package-owned content.
// ABOUTME: Exercises the production bundle where module-relative paths change.

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { firefox } from "@playwright/test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const site = fileURLToPath(new URL("../../", import.meta.url));
const repository = fileURLToPath(new URL("../../../../", import.meta.url));
const canonicalSkillPaths = {
	skill: "SKILL.md",
	metadata: "agents/openai.yaml",
	icon: "assets/icon.svg",
	reference: "references/language.md",
} as const;
const archiveEntries = [
	"gic-agent/SKILL.md",
	"gic-agent/agents/openai.yaml",
	"gic-agent/assets/icon.svg",
	"gic-agent/references/language.md",
];

async function readCanonicalSkillFiles() {
	const [skill, metadata, icon, reference] = await Promise.all(
		Object.values(canonicalSkillPaths).map((path) =>
			readFile(
				new URL(
					`../../../../packages/content/content/skills/gic-agent/${path}`,
					import.meta.url,
				),
			),
		),
	);
	return { skill, metadata, icon, reference };
}

test("build renders exactly two Skill actions and the combined source document", async () => {
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
	const sectionLabel = skillPage.indexOf('aria-label="Skill actions"');
	const actionsStart = skillPage.lastIndexOf("<section", sectionLabel);
	const actionsContentStart = skillPage.indexOf(">", actionsStart) + 1;
	const actionsEnd = skillPage.indexOf("</section>", actionsContentStart);
	const skillArticle = skillPage.indexOf("<article");
	assert.ok(actionsStart >= 0 && actionsStart < skillArticle);
	assert.ok(actionsEnd > actionsContentStart);
	const actionsContent = skillPage.slice(actionsContentStart, actionsEnd);
	const links = [...actionsContent.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
	assert.equal(links.length, 2);
	assert.deepEqual(
		links.map((link) => (link[2] ?? "").replace(/<[^>]*>/g, "").trim()),
		["Download skill (ZIP)", "View raw skill"],
	);
	assert.match(links[0]?.[1] ?? "", /href="\/skills\/gic-agent\.zip"/);
	assert.match(links[0]?.[1] ?? "", /\sdownload(?:\s|$)/);
	assert.match(links[1]?.[1] ?? "", /href="\/skills\/gic-agent\.txt"/);
	assert.match(links[1]?.[1] ?? "", /target="_blank"/);
	assert.match(links[1]?.[1] ?? "", /rel="noopener noreferrer"/);
	assert.equal(
		actionsContent.replace(/<a\b[^>]*>[\s\S]*?<\/a>/g, "").trim(),
		"",
	);
	assert.match(skillPage, /aria-label="Documentation"[\s\S]*?>[\s\S]*?Skill/);
	assert.doesNotMatch(skillPage, /GiC editor agent only/);
	assert.doesNotMatch(
		skillPage,
		/search_reference|read_reference|search_examples/,
	);
	assert.match(skillPage, /<h2>GiC agent skill<\/h2>/);
	assert.match(skillPage, /<h2>Language reference<\/h2>/);

	const canonicalFiles = await readCanonicalSkillFiles();
	const rawText = [
		canonicalFiles.skill.toString("utf8"),
		"--- gic-agent/references/language.md ---",
		canonicalFiles.reference.toString("utf8"),
	].join("\n\n");
	assert.equal(
		await readFile(
			new URL("../../dist/skills/gic-agent.txt", import.meta.url),
			"utf8",
		),
		rawText,
	);
});

test("skill routes publish source files and a ZIP of the exact canonical sources", async () => {
	const archive = new URL("../../dist/skills/gic-agent.zip", import.meta.url);
	const temporaryDirectory = await mkdtemp(`${tmpdir()}/gic-agent-`);

	try {
		const archiveListing = await promisify(execFile)("unzip", [
			"-Z1",
			fileURLToPath(archive),
		]);
		assert.deepEqual(
			archiveListing.stdout
				.trim()
				.split("\n")
				.filter((path) => !path.endsWith("/"))
				.sort(),
			archiveEntries,
		);
		await promisify(execFile)("unzip", [
			"-q",
			fileURLToPath(archive),
			"-d",
			temporaryDirectory,
		]);

		const canonicalFiles = await readCanonicalSkillFiles();
		for (const [path, source] of [
			["gic-agent/SKILL.md", canonicalFiles.skill],
			["gic-agent/agents/openai.yaml", canonicalFiles.metadata],
			["gic-agent/assets/icon.svg", canonicalFiles.icon],
			["gic-agent/references/language.md", canonicalFiles.reference],
		] as const) {
			assert.deepEqual(await readFile(join(temporaryDirectory, path)), source);
		}
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
				href: "/workshop/skills/gic-agent.txt",
				path: "skills/gic-agent.txt",
			},
		];
		for (const { href } of exports) {
			assert.ok(skillPage.includes(`href="${href}"`));
		}

		const canonicalFiles = await readCanonicalSkillFiles();
		const rawText = [
			canonicalFiles.skill.toString("utf8"),
			"--- gic-agent/references/language.md ---",
			canonicalFiles.reference.toString("utf8"),
		].join("\n\n");
		assert.equal(
			await readFile(join(outputDirectory, exports[1].path), "utf8"),
			rawText,
		);

		const archive = join(outputDirectory, exports[0].path);
		const archiveListing = await promisify(execFile)("unzip", ["-Z1", archive]);
		assert.deepEqual(
			archiveListing.stdout.trim().split("\n").sort(),
			archiveEntries,
		);
		await mkdir(extractionDirectory);
		await promisify(execFile)("unzip", [
			"-q",
			archive,
			"-d",
			extractionDirectory,
		]);
		for (const [path, source] of [
			["gic-agent/SKILL.md", canonicalFiles.skill],
			["gic-agent/agents/openai.yaml", canonicalFiles.metadata],
			["gic-agent/assets/icon.svg", canonicalFiles.icon],
			["gic-agent/references/language.md", canonicalFiles.reference],
		] as const) {
			assert.deepEqual(await readFile(join(extractionDirectory, path)), source);
		}
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

test("documentation uses grey inline code and plain scrollable code blocks", async (t) => {
	const types: Record<string, string> = {
		".css": "text/css",
		".html": "text/html",
		".js": "text/javascript",
		".png": "image/png",
		".svg": "image/svg+xml",
		".ttf": "font/ttf",
	};
	const server = createServer(async (request, response) => {
		const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
		const file = new URL(
			`../../dist${path.endsWith("/") ? `${path}index.html` : path}`,
			import.meta.url,
		);
		try {
			const body = await readFile(file);
			response.writeHead(200, {
				"content-type":
					types[extname(file.pathname)] ?? "application/octet-stream",
			});
			response.end(body);
		} catch {
			response.writeHead(404).end();
		}
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
	const address = server.address();
	assert.ok(address !== null && typeof address !== "string");
	const browser = await firefox.launch();
	t.after(() => browser.close());
	const page = await browser.newPage();
	await page.goto(`http://127.0.0.1:${address.port}/docs/functions/`);
	const inline = page.locator("main p code").first();
	const block = page.locator("main pre").first();
	assert.equal(await inline.count(), 1);
	assert.equal(await block.count(), 1);
	const styles = await page.evaluate(() => {
		const inline = getComputedStyle(document.querySelector("main p code")!);
		const block = getComputedStyle(document.querySelector("main pre")!);
		const blockCode = getComputedStyle(
			document.querySelector("main pre code")!,
		);
		const body = getComputedStyle(document.body);
		return {
			inlineBackground: inline.backgroundColor,
			inlineStyle: inline.fontStyle,
			inlineFamily: inline.fontFamily,
			inlineSize: inline.fontSize,
			blockBackground: block.backgroundColor,
			blockCodeBackground: blockCode.backgroundColor,
			blockFamily: block.fontFamily,
			blockSize: block.fontSize,
			blockCodeFamily: blockCode.fontFamily,
			blockCodeSize: blockCode.fontSize,
			blockStyle: blockCode.fontStyle,
			blockWhitespace: blockCode.whiteSpace,
			borderLeft: block.borderLeftWidth,
			paddingLeft: block.paddingLeft,
			overflowX: block.overflowX,
			bodyFamily: body.fontFamily,
			bodySize: body.fontSize,
		};
	});
	assert.equal(styles.inlineBackground, "rgb(240, 240, 240)");
	assert.equal(styles.inlineStyle, "italic");
	assert.equal(styles.inlineFamily, styles.bodyFamily);
	assert.equal(styles.inlineSize, styles.bodySize);
	assert.equal(styles.blockBackground, "rgba(0, 0, 0, 0)");
	assert.equal(styles.blockCodeBackground, "rgba(0, 0, 0, 0)");
	assert.equal(styles.blockStyle, "normal");
	assert.equal(styles.blockFamily, styles.bodyFamily);
	assert.equal(styles.blockSize, styles.bodySize);
	assert.equal(styles.blockCodeFamily, styles.bodyFamily);
	assert.equal(styles.blockCodeSize, styles.bodySize);
	assert.equal(styles.blockWhitespace, "pre");
	assert.equal(styles.borderLeft, "0px");
	assert.equal(styles.paddingLeft, "0px");
	assert.equal(styles.overflowX, "auto");
});
