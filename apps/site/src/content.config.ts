import { defineCollection } from "astro:content";
import { posix } from "node:path";
import { listContentFiles, readGicAgentSkill } from "@giclang/content/node";
import {
	compileMarkdown,
	compileSkillDocumentation,
} from "@giclang/content/markdown";

const loader = async () => {
	const [files, skill] = await Promise.all([
		listContentFiles("docs"),
		readGicAgentSkill(),
	]);
	return files.flatMap((file) => {
		if (file.kind !== "markdown") return [];
		const resolveImage = (source: string): string => {
			const path = posix.join(posix.dirname(file.path), source);
			return `/docs-assets/${path}`;
		};
		const content =
			file.path === "docs/skill.md"
				? compileSkillDocumentation(
						file.path,
						file.source,
						skill.skillSource,
						skill.referenceSource,
						resolveImage,
					)
				: compileMarkdown(file.path, file.source, resolveImage);
		return [
			{
				id: file.path.replace(/^docs\//, "").replace(/\.md$/, ""),
				...content,
			},
		];
	});
};

const docs = defineCollection({
	loader: loader,
});

export const collections = { docs };
