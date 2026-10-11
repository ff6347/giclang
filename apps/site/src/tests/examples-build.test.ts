// ABOUTME: Verifies the static examples page against package-authored content.
// ABOUTME: Builds root and nested-base sites to check exact copy payloads and assets.

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify, stripVTControlCharacters } from "node:util";
import { compileMarkdown } from "@giclang/content/markdown";
import { listContentFiles } from "@giclang/content/node";
import { renderUserMarkdown } from "@giclang/content/user-markdown";

const site = fileURLToPath(new URL("../../", import.meta.url));

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

function normalizeHtml(html: string): string {
	return html.replace(/\s+/g, " ").trim();
}

async function canonicalExamples() {
	const files = await listContentFiles("examples");
	const descriptions = files.flatMap((file) => {
		if (file.kind !== "markdown") return [];
		const content = compileMarkdown(file.path, file.source);
		assert.ok("enabled" in content);
		return [{ ...content, id: file.path.split("/")[1] }];
	});
	const examples = [];
	for (const description of descriptions) {
		if (!description.enabled) continue;
		const sourceFile = files.find(
			(file) =>
				file.path === `examples/${description.id}/${description.id}.gic`,
		);
		const thumbnailFile = files.find(
			(file) => file.path === `examples/${description.id}/thumbnail.png`,
		);
		assert.ok(sourceFile);
		assert.ok(thumbnailFile);
		examples.push({
			...description,
			source: await readFile(sourceFile.fileUrl, "utf8"),
			thumbnail: await readFile(thumbnailFile.fileUrl),
		});
	}
	return examples.toSorted(
		(left, right) =>
			left.order - right.order || left.title.localeCompare(right.title),
	);
}

async function verifyExamples(outputDirectory: string, base: string) {
	const html = await readFile(
		join(outputDirectory, "examples/index.html"),
		"utf8",
	);
	const home = await readFile(join(outputDirectory, "index.html"), "utf8");
	for (const page of [home, html]) {
		assert.match(
			page,
			new RegExp(
				`<nav[^>]*aria-label="Main navigation"[\\s\\S]*?href="${base}examples/"`,
			),
		);
	}
	assert.match(html, /<h1[^>]*>Examples<\/h1>/);
	assert.ok(
		!/<pre\b|data-copy-text=/.test(html),
		"overview cards omit full source and copy payloads",
	);
	assert.doesNotMatch(html, /<(?:textarea|details|canvas|iframe)\b/i);
	assert.doesNotMatch(
		html,
		/Load this example|Run this example|data-gic-|runtime\.js/,
	);

	const examples = await canonicalExamples();
	assert.ok(examples.length > 0);
	const cards = [
		...html.matchAll(
			/<li\b[^>]*data-example-id="([^"]+)"[^>]*>([\s\S]*?)<\/li>/g,
		),
	];
	assert.deepEqual(
		cards.map((card) => card[1]),
		examples.map((example) => example.id),
	);
	const { createExampleCopyText } = await import("@giclang/content/model");
	const pages = [html];
	const detailDirectories = (
		await readdir(join(outputDirectory, "examples"), { withFileTypes: true })
	)
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
	assert.deepEqual(
		detailDirectories,
		examples.map((example) => example.id).sort(),
	);

	for (const [index, example] of examples.entries()) {
		const card = cards[index]?.[2] ?? "";
		assert.match(card, /<h2\b/);
		assert.ok(card.includes(example.title));
		const description =
			/<div\b[^>]*class="content-markdown"[^>]*>([\s\S]*?)<\/div>/.exec(card);
		assert.equal(
			normalizeHtml(description?.[1] ?? ""),
			normalizeHtml(renderUserMarkdown(example.markdown)),
		);
		assert.doesNotMatch(
			description?.[1] ?? "",
			/<(?:a|button|input|img|iframe)\b/,
		);
		const links = [...card.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].filter(
			(link) => /\bclass="example-link"/.test(link[1] ?? ""),
		);
		assert.equal(
			links.length,
			2,
			"thumbnail and title both link to the detail page",
		);
		for (const link of links)
			assert.equal(
				/href="([^"]+)"/.exec(link[1] ?? "")?.[1],
				`${base}examples/${encodeURIComponent(example.id)}/`,
			);
		assert.match(links[0]?.[2] ?? "", /<img\b/);
		assert.equal(decodeHtml(links[1]?.[2] ?? ""), example.title);
		assert.ok(example.id);
		const detail = await readFile(
			join(outputDirectory, "examples", example.id, "index.html"),
			"utf8",
		);
		pages.push(detail);
		assert.doesNotMatch(detail, /<(?:textarea|details|canvas|iframe)\b/i);
		assert.doesNotMatch(
			detail,
			/Load this example|Run this example|data-gic-|runtime\.js/,
		);
		assert.match(
			detail,
			new RegExp(`href="${base}examples/"[^>]*>Back to examples<`),
		);
		const fullDescription =
			/<div\b[^>]*class="content-markdown"[^>]*>([\s\S]*?)<\/div>/.exec(detail);
		assert.equal(
			normalizeHtml(fullDescription?.[1] ?? ""),
			normalizeHtml(example.html),
		);
		const source =
			/<pre\b([^>]*)>\s*<code\b([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/.exec(
				detail,
			);
		assert.ok(source, `${example.id} has permanently visible source`);
		const attributes = `${source[1]} ${source[2]}`;
		assert.doesNotMatch(
			attributes.replace(/"[^"]*"/g, '""'),
			/(?:^|\s)hidden(?:=|\s|$)/i,
		);
		assert.doesNotMatch(attributes, /style="[^"]*display:\s*none/i);
		assert.equal(decodeHtml(source[3]), example.source);

		const buttons = [
			...detail.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g),
		].filter((button) => button[1]?.includes("data-copy-text"));
		assert.equal(buttons.length, 1);
		assert.equal(
			buttons[0]?.[2].replace(/<[^>]*>/g, "").trim(),
			"Copy to clipboard",
		);
		const payload = /data-copy-text="([^"]*)"/.exec(buttons[0]?.[1] ?? "");
		assert.ok(payload);
		const copyText = decodeURIComponent(decodeHtml(payload[1]));
		assert.equal(
			copyText,
			createExampleCopyText({
				markdown: example.markdown,
				source: example.source,
			}),
		);
		assert.ok(
			copyText.includes(example.markdown),
			"full authored body is preserved",
		);
		assert.ok(
			copyText.includes(`\`\`\`gic\n${example.source}`),
			"exact authored source is fenced as gic",
		);
		assert.doesNotMatch(copyText, /^---\s*\n/);
		assert.match(detail, /role="status"/);

		const thumbnail = /<img\b[^>]*src="([^"]+)"/.exec(card);
		assert.ok(thumbnail);
		assert.ok(thumbnail[1].startsWith(`${base}_astro/`));
		const assetPath = decodeURIComponent(thumbnail[1].slice(base.length));
		assert.deepEqual(
			await readFile(join(outputDirectory, assetPath)),
			example.thumbnail,
		);
	}

	const scripts = pages.flatMap((page) => [
		...page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g),
	]);
	assert.ok(scripts.length > 0);
	const scriptSources = await Promise.all(
		scripts.map(async ([, attributes, inlineSource]) => {
			const source = /src="([^"]+)"/.exec(attributes)?.[1];
			if (source === undefined) return inlineSource;
			assert.ok(source.startsWith(base));
			return readFile(join(outputDirectory, source.slice(base.length)), "utf8");
		}),
	);
	assert.match(scriptSources.join("\n"), /clipboard\.writeText/);
	assert.doesNotMatch(
		scriptSources.join("\n"),
		/runSource|new Worker|execCommand|createElement\(["'](?:textarea|details)|eval\(/,
	);
}

test("real builds publish canonical static examples at root and a non-root base", async (t) => {
	for (const base of ["/", "/workshop/"]) {
		await t.test(`examples under ${base}`, async () => {
			const directory = await mkdtemp(join(tmpdir(), "gic-examples-build-"));
			const outputDirectory = join(directory, "dist");
			try {
				const build = await promisify(execFile)(
					"pnpm",
					[
						"exec",
						"astro",
						"build",
						"--base",
						base,
						"--outDir",
						outputDirectory,
					],
					{ cwd: site, timeout: 120_000 },
				);
				assert.equal(build.stderr, "");
				const output = stripVTControlCharacters(build.stdout);
				assert.doesNotMatch(output, /\[ERROR\]/);
				for (const warning of output.split(/(?=\[WARN\])/).slice(1)) {
					const message = warning.split(/\n(?=\d{2}:\d{2}:\d{2} \[)/)[0];
					assert.match(
						message,
						/^\[WARN\] \[vite\] \[EVAL\] Use of direct `eval` function is strongly discouraged as it poses security risks and may cause issues with minification\.\n/,
					);
					assert.match(
						message,
						/\[ [^\n]*\/gray-matter\/lib\/engines\.js:43:14 \]/,
					);
				}
				await verifyExamples(outputDirectory, base);
			} finally {
				await rm(directory, { recursive: true, force: true });
			}
		});
	}
});
