// ABOUTME: Verifies Vite refreshes bundled content when an authored file appears or disappears.
// ABOUTME: Exercises the real workspace content directory and Vite module graph.

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

test(
	"skill documentation refreshes when either canonical source changes",
	{ timeout: 45_000 },
	async () => {
		const skillPath = fileURLToPath(
			new URL(
				"../../../../packages/content/content/skills/gic-agent/SKILL.md",
				import.meta.url,
			),
		);
		const referencePath = fileURLToPath(
			new URL(
				"../../../../packages/content/content/skills/gic-agent/references/language.md",
				import.meta.url,
			),
		);
		const skillGuidePath = fileURLToPath(
			new URL(
				"../../../../packages/content/content/docs/skill.md",
				import.meta.url,
			),
		);
		const [originalSkill, originalReference] = await Promise.all([
			readFile(skillPath),
			readFile(referencePath),
		]);
		const server = await createServer({
			configFile: fileURLToPath(
				new URL("../../vite.config.ts", import.meta.url),
			),
			logLevel: "error",
			root: fileURLToPath(new URL("../../", import.meta.url)),
			server: { middlewareMode: true, preTransformRequests: false },
		});
		const transformSkillGuide = async () => {
			const results = await Promise.all([
				server.transformRequest(`/@fs${skillGuidePath}`),
				server.transformRequest(`/@fs${skillGuidePath}?skill-export`),
			]);
			assert.ok(results[0]);
			assert.ok(results[1]);
			const serialized = results[1].code.match(/export default (.*);/);
			assert.ok(serialized?.[1]);
			const value: unknown = JSON.parse(serialized[1]);
			assert.ok(typeof value === "object" && value !== null);
			assert.deepEqual(Object.keys(value), ["archiveBase64"]);
			assert.ok(
				"archiveBase64" in value && typeof value.archiveBase64 === "string",
			);
			return { guide: results[0].code, archive: value.archiveBase64 };
		};
		const waitForFixture = async (
			fixture: string,
			present: boolean,
			originalArchive: string,
		) => {
			for (let attempt = 0; attempt < 50; attempt++) {
				const result = await transformSkillGuide();
				if (
					result.guide.includes(fixture) === present &&
					(result.archive !== originalArchive) === present
				)
					return;
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
			const result = await transformSkillGuide();
			assert.equal(result.guide.includes(fixture), present);
			assert.equal(result.archive !== originalArchive, present);
		};

		try {
			const { archive: originalArchive } = await transformSkillGuide();
			const skillFixture = `editor-skill-watch-${randomUUID()}`;
			await writeFile(
				skillPath,
				`${originalSkill.toString("utf8")}\n\n${skillFixture}\n`,
			);
			await waitForFixture(skillFixture, true, originalArchive);
			await writeFile(skillPath, originalSkill);
			await waitForFixture(skillFixture, false, originalArchive);

			const referenceFixture = `editor-reference-watch-${randomUUID()}`;
			await writeFile(
				referencePath,
				`${originalReference.toString("utf8")}\n\n${referenceFixture}\n`,
			);
			await waitForFixture(referenceFixture, true, originalArchive);
			await writeFile(referencePath, originalReference);
			await waitForFixture(referenceFixture, false, originalArchive);
		} finally {
			await Promise.all([
				writeFile(skillPath, originalSkill),
				writeFile(referencePath, originalReference),
			]);
			await server.close();
		}
	},
);

test("content discovery refreshes after creating and deleting documents and examples", async () => {
	const id = `content-watch-${randomUUID()}`;
	const document = new URL(
		`../../../../packages/content/content/docs/${id}.md`,
		import.meta.url,
	);
	const example = new URL(
		`../../../../packages/content/content/examples/${id}/`,
		import.meta.url,
	);
	const server = await createServer({
		configFile: fileURLToPath(new URL("../../vite.config.ts", import.meta.url)),
		logLevel: "error",
		root: fileURLToPath(new URL("../../", import.meta.url)),
		server: { middlewareMode: true, preTransformRequests: false },
	});
	const hasContent = async (name: string) => {
		const result = await server.transformRequest("/src/lib/content.ts");
		assert.ok(result);
		return result.code.includes(name);
	};
	const waitForContent = async (name: string, expected: boolean) => {
		for (let attempt = 0; attempt < 50; attempt++) {
			if ((await hasContent(name)) === expected) return;
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		assert.strictEqual(await hasContent(name), expected);
	};

	try {
		assert.strictEqual(await hasContent(`${id}.md`), false);
		await writeFile(
			document,
			"---\ntitle: Content watcher\norder: 999\n---\nA watched page.\n",
		);
		await waitForContent(`${id}.md`, true);
		await rm(document);
		await waitForContent(`${id}.md`, false);

		await mkdir(example);
		await Promise.all([
			writeFile(
				new URL("description.md", example),
				"---\ntitle: Content watcher\norder: 999\nenabled: true\ncategories: [Test]\ntags: [test]\n---\nA watched example.\n",
			),
			writeFile(new URL(`${id}.gic`, example), "circle(10, 10, 10);\n"),
			copyFile(
				new URL(
					"../../../../packages/content/content/examples/repeat/thumbnail.png",
					import.meta.url,
				),
				new URL("thumbnail.png", example),
			),
		]);
		await waitForContent(`/${id}/description.md`, true);
		await rm(example, { recursive: true });
		await waitForContent(`/${id}/description.md`, false);
	} finally {
		await rm(document, { force: true });
		await rm(example, { force: true, recursive: true });
		await server.close();
	}
});
