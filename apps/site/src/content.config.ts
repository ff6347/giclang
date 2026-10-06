import { defineCollection } from "astro:content";
import { posix } from "node:path";
import { listContentFiles } from "@giclang/content/node";
import { compileMarkdown } from "@giclang/content/markdown";

const loader = async () => {
	const files = await listContentFiles("docs");
	return files.flatMap((file) => {
		return file.kind === "markdown"
			? [
					{
						id: file.path.replace(/^docs\//, "").replace(/\.md$/, ""),
						...compileMarkdown(file.path, file.source, (source) => {
							const path = posix.join(posix.dirname(file.path), source);
							return `/docs-assets/${path}`;
						}),
					},
				]
			: [];
	});
};

const docs = defineCollection({
	loader: loader,
});

export const collections = { docs };
