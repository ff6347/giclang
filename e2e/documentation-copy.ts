// ABOUTME: Reads complete authored documentation as independent clipboard acceptance inputs.
// ABOUTME: Includes the Skill guide, instructions, and reference without using export serialization.

import {
	listContentFiles,
	readGicAgentSkill,
} from "../packages/content/src/content-files.ts";

function authoredBody(source: string): string {
	return source.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "");
}

export async function readBundledDocumentation(id: string) {
	const files = await listContentFiles("docs");
	const file = files.find((entry) => entry.path === `docs/${id}.md`);
	if (!file || file.kind !== "markdown")
		throw new Error(`Missing documentation '${id}'.`);
	const title = file.frontmatter["title"];
	if (typeof title !== "string")
		throw new Error(`Missing documentation title '${id}'.`);
	let markdown = authoredBody(file.source);
	if (id === "skill") {
		const skill = await readGicAgentSkill();
		markdown = [
			markdown,
			"## GiC agent skill",
			authoredBody(skill.skillSource),
			"## Language reference",
			skill.referenceSource,
		].join("\n\n");
	}
	markdown = markdown
		.replaceAll(
			"(./colors-named.md)",
			"(https://giclang.cc/docs/colors-named.md)",
		)
		.replace(
			/\(\.\/images\/drawing\/([^)]*)\)/g,
			"(https://giclang.cc/docs-assets/docs/images/drawing/$1)",
		);
	return {
		id,
		title: title.trim(),
		markdown,
		copyText: `# ${title.trim()}\n\n${markdown}`,
	};
}
