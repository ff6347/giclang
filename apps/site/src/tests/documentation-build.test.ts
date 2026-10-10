// ABOUTME: Verifies complete documentation copy payloads and static Markdown exports.
// ABOUTME: Builds the real catalogue at root and nested bases without browser servers.

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, posix } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify, stripVTControlCharacters } from "node:util";
import {
	compileMarkdown,
	compileSkillDocumentation,
} from "@giclang/content/markdown";
import { listContentFiles, readGicAgentSkill } from "@giclang/content/node";

const site = fileURLToPath(new URL("../../", import.meta.url));

function authoredBody(source: string): string {
	return source.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "");
}

function expectedPortableBody(body: string): string {
	return body
		.replaceAll(
			"(./colors-named.md)",
			"(https://giclang.cc/docs/colors-named.md)",
		)
		.replace(
			/\(\.\/images\/drawing\/([^)]*)\)/g,
			"(https://giclang.cc/docs-assets/docs/images/drawing/$1)",
		);
}

function normalizeHtml(html: string): string {
	return html.replace(/\s+/g, " ").trim();
}

function decodeHtml(text: string): string {
	return text.replace(/&(amp|lt|gt|quot|#39);/g, (entity) => {
		switch (entity) {
			case "&amp;":
				return "&";
			case "&lt;":
				return "<";
			case "&gt;":
				return ">";
			case "&quot;":
				return '"';
			default:
				return "'";
		}
	});
}

function verifyExportControls(html: string, base: string, fullText: string) {
	const controls =
		/<section\b[^>]*aria-label="Documentation exports"[^>]*>([\s\S]*?)<\/section>/.exec(
			html,
		)?.[1];
	assert.ok(controls, "Docs exposes documentation exports separately");
	assert.match(
		controls,
		new RegExp(
			`href="${base}llms\\.txt"[^>]*>\\s*Documentation index \\(llms\\.txt\\)`,
		),
	);
	assert.match(
		controls,
		new RegExp(
			`href="${base}llms-full\\.txt"[^>]*download="llms-full\\.txt"[^>]*>\\s*Download all docs`,
		),
	);
	const buttons = [
		...controls.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g),
	];
	assert.equal(buttons.length, 1);
	assert.match(buttons[0][1], /aria-label="Copy all docs"/);
	const payload = /data-copy-text="([^"]*)"/.exec(buttons[0][1]);
	assert.ok(payload);
	assert.equal(decodeURIComponent(decodeHtml(payload[1])), fullText);
	assert.match(controls, /may exceed[\s\S]*chat[\s\S]*limits/i);
	assert.match(controls, /individual page/i);
	assert.doesNotMatch(controls, /<(?:textarea|input|details)\b/);
}

async function verifyDocumentation(output: string, base: string) {
	const files = await listContentFiles("docs");
	const skill = await readGicAgentSkill();
	const documents = files.filter((file) => file.kind === "markdown");
	const published = await readdir(join(output, "docs"));
	assert.deepEqual(
		published.filter((file) => file.endsWith(".md")).sort(),
		documents.map((file) => posix.basename(file.path)).sort(),
	);
	const ordered = documents.toSorted(
		(left, right) =>
			Number(left.frontmatter.order) - Number(right.frontmatter.order) ||
			String(left.frontmatter.title).localeCompare(
				String(right.frontmatter.title),
			),
	);
	const index = await readFile(join(output, "llms.txt"), "utf8");
	const fullText = await readFile(join(output, "llms-full.txt"), "utf8");
	assert.match(index, /^# GiC\n/);
	assert.deepEqual(
		[...index.matchAll(/^## (.+)$/gm)].map((match) => match[1]),
		["Documentation", "Optional"],
	);
	const links = [...index.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
	assert.deepEqual(
		links.filter((link) => link[2].endsWith(".md")).map((link) => link[1]),
		ordered.map((file) => String(file.frontmatter.title).trim()),
	);
	assert.deepEqual(
		links.map((link) => link[2]).sort(),
		[...documents.map((file) => file.path), "llms-full.txt"].sort(),
	);
	for (const origin of ["https://giclang.cc", "https://unrelated.example"]) {
		for (const [, , href] of links) {
			const url = new URL(href, `${origin}${base}llms.txt`);
			assert.equal(url.origin, origin);
			assert.ok(url.pathname.startsWith(base));
			assert.ok(
				(await readFile(join(output, url.pathname.slice(base.length)))).length,
			);
		}
	}
	const sections = await Promise.all(
		ordered.map(async (file) => {
			const page = await readFile(join(output, file.path), "utf8");
			const title = String(file.frontmatter.title).trim();
			assert.ok(page.startsWith(`# ${title}\n\n`));
			return `# ${title}\n\nSource: https://giclang.cc/${file.path}\n\n${page.slice(`# ${title}\n\n`.length)}`;
		}),
	);
	assert.equal(
		fullText,
		`# GiC documentation\n\n${sections.join("\n\n---\n\n")}`,
	);
	assert.equal([...fullText.matchAll(/^Source: /gm)].length, documents.length);
	assert.doesNotMatch(
		fullText,
		/<html\b|<!doctype|file:\/\/|\/Users\/|\.agents\/(?:MEMORY\.md|journals\/|plans\/|decisions\/)|name: gic-agent\n/,
	);
	const catalogue = await readFile(join(output, "docs", "index.html"), "utf8");
	verifyExportControls(catalogue, base, fullText);
	for (const file of documents) {
		const id = file.path.slice("docs/".length, -".md".length);
		const resolveImage = (href: string) =>
			`${base}docs-assets/${posix.join(posix.dirname(file.path), href)}`;
		const compiled =
			id === "skill"
				? compileSkillDocumentation(
						file.path,
						file.source,
						skill.skillSource,
						skill.referenceSource,
						resolveImage,
					)
				: compileMarkdown(file.path, file.source, resolveImage);
		const body =
			id === "skill"
				? [
						authoredBody(file.source),
						"## GiC agent skill",
						authoredBody(skill.skillSource),
						"## Language reference",
						skill.referenceSource,
					].join("\n\n")
				: authoredBody(file.source);
		const expected = `# ${compiled.title}\n\n${expectedPortableBody(body)}`;
		const html = await readFile(join(output, "docs", id, "index.html"), "utf8");
		const buttons = [
			...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g),
		].filter((button) => button[1]?.includes('aria-label="Copy page"'));
		verifyExportControls(html, base, fullText);

		assert.equal(buttons.length, 1, `${id} has one Copy page control`);
		assert.match(buttons[0]?.[1] ?? "", /aria-label="Copy page"/);
		assert.equal(buttons[0]?.[2].replace(/<[^>]*>/g, "").trim(), "Copy page");
		const payload = /data-copy-text="([^"]*)"/.exec(buttons[0]?.[1] ?? "");
		assert.ok(payload, `${id} has bundled copy text`);
		assert.equal(decodeURIComponent(decodeHtml(payload[1])), expected);
		const exported = await readFile(join(output, "docs", `${id}.md`), "utf8");
		assert.equal(
			exported,
			expected,
			`${id} exports exactly the same complete text`,
		);
		assert.doesNotMatch(exported, /^---\s*\n|<html\b|<!doctype/i);
		assert.doesNotMatch(html, /<(?:textarea|input)\b|Copy skill|execCommand/);
		const article =
			/<article\b[^>]*>([\s\S]*?)<\/article>/.exec(html)?.[1] ?? "";
		assert.equal(
			normalizeHtml(article),
			normalizeHtml(compiled.html),
			`${id} preserves rendered content`,
		);
		assert.ok(
			html.includes(`href="${base}docs/">docs</a>`),
			"main documentation navigation honors the base",
		);
		const nav =
			/<nav\b[^>]*aria-label="Documentation"[^>]*>([\s\S]*?)<\/nav>/.exec(
				html,
			)?.[1] ?? "";
		assert.deepEqual(
			[...nav.matchAll(/href="([^"]+)"/g)].map((link) => link[1]),
			documents
				.map((entry) => `${base}${entry.path.slice(0, -3)}`)
				.toSorted((left, right) => left.localeCompare(right)),
		);
		assert.match(
			nav,
			new RegExp(`href="${base}docs/${id}"[^>]*aria-current="page"`),
		);
		for (const [, href] of article.matchAll(/<img\b[^>]*src="([^"]+)"/g)) {
			assert.ok(href.startsWith(`${base}docs-assets/`));
			const path = decodeURIComponent(href.slice(`${base}docs-assets/`.length));
			const asset = files.find((entry) => entry.path === path);
			assert.ok(asset);
			assert.deepEqual(
				await readFile(join(output, href.slice(base.length))),
				await readFile(asset.fileUrl),
			);
		}
		const portableHtml = compileMarkdown(
			"docs/export.md",
			`---\ntitle: Export\norder: 1\n---\n${exported}`,
		).html;
		for (const [, href] of portableHtml.matchAll(/(?:href|src)="([^"]+)"/g)) {
			const url = new URL(decodeHtml(href));
			if (url.origin !== "https://giclang.cc") continue;
			assert.doesNotMatch(url.pathname, /workshop/);
			const bytes = await readFile(
				join(
					output,
					decodeURIComponent(url.pathname),
					extname(url.pathname) ? "" : "index.html",
				),
			);
			assert.ok(bytes.length > 0, `${href} resolves to an emitted file`);
		}
		if (id === "skill") {
			const actions =
				/<section\b[^>]*aria-label="Skill actions"[^>]*>([\s\S]*?)<\/section>/.exec(
					html,
				);
			assert.ok(actions);
			assert.deepEqual(
				[...actions[1].matchAll(/href="([^"]+)"/g)].map((link) => link[1]),
				[`${base}skills/gic-agent.zip`, `${base}skills/gic-agent.txt`],
			);
			assert.doesNotMatch(actions[1], /<button\b|data-copy-text/);
			assert.ok(exported.includes("## GiC agent skill"));
			assert.ok(exported.includes("## Language reference"));
			assert.doesNotMatch(exported, /\nname: gic-agent\n|\ndescription:/);
		}
		const scripts = [
			...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g),
		];
		assert.ok(scripts.length > 0);
		const scriptSource = (
			await Promise.all(
				scripts.map(([, attributes, source]) => {
					const href = /src="([^"]+)"/.exec(attributes)?.[1];
					if (href === undefined) return source;
					assert.ok(href.startsWith(base));
					return readFile(join(output, href.slice(base.length)), "utf8");
				}),
			)
		).join("\n");
		assert.match(scriptSource, /clipboard\.writeText/);
		assert.doesNotMatch(
			scriptSource,
			/\bfetch\(|XMLHttpRequest|execCommand|createElement\(["']textarea/,
		);
	}
}

test("real builds copy and publish every complete documentation page at root and nested bases", async (t) => {
	for (const base of ["/", "/workshop/"]) {
		await t.test(`documentation under ${base}`, async () => {
			const directory = await mkdtemp(
				join(tmpdir(), "gic-documentation-build-"),
			);
			try {
				const output = join(directory, "dist");
				const build = await promisify(execFile)(
					"pnpm",
					["exec", "astro", "build", "--base", base, "--outDir", output],
					{ cwd: site, timeout: 120_000 },
				);
				assert.equal(build.stderr, "");
				assert.doesNotMatch(
					stripVTControlCharacters(build.stdout),
					/\[ERROR\]/,
				);
				await verifyDocumentation(output, base);
			} finally {
				await rm(directory, { recursive: true, force: true });
			}
		});
	}
});
