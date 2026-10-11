// ABOUTME: Loads package-owned example bundles for the website's static routes.
// ABOUTME: Shares enabled examples, authored source, and build-owned thumbnail URLs.

import { readFile } from "node:fs/promises";
import { compileMarkdown } from "@giclang/content/markdown";
import {
	createExamples,
	type ExampleDescription,
} from "@giclang/content/model";
import { listContentFiles } from "@giclang/content/node";

const exampleDescriptions: Record<string, ExampleDescription> = {};
const exampleSources: Record<string, string> = {};
const exampleThumbnails = import.meta.glob<string>(
	"../../../../packages/content/content/examples/*/thumbnail.png",
	{ eager: true, query: "?url&no-inline", import: "default" },
);

for (const file of await listContentFiles("examples")) {
	const path = `/content/${file.path}`;
	if (file.kind === "markdown") {
		const description = compileMarkdown(file.path, file.source);
		if (!("enabled" in description)) {
			throw new Error(`Example description '${file.path}' requires metadata.`);
		}
		exampleDescriptions[path] = description;
	} else if (file.path.endsWith(".gic")) {
		exampleSources[path] = await readFile(file.fileUrl, "utf8");
	}
}

export const examples = createExamples({
	exampleDescriptions,
	exampleSources,
	exampleThumbnails,
});
