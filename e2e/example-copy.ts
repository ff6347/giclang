// ABOUTME: Reads complete bundled example inputs for host acceptance tests.
// ABOUTME: Compares browser clipboard and visible source against canonical content.

import { readFile } from "node:fs/promises";
import { compileMarkdown } from "../packages/content/src/markdown-content.ts";
import { createExampleCopyText } from "../packages/content/src/content-model.ts";
import { listContentFiles } from "../packages/content/src/content-files.ts";

export async function readBundledExample() {
	const files = await listContentFiles("examples");
	const descriptions = files
		.flatMap((file) => {
			if (file.kind !== "markdown") return [];
			const description = compileMarkdown(file.path, file.source);
			if (!("enabled" in description) || !description.enabled) return [];
			return [{ ...description, id: file.path.split("/")[1] }];
		})
		.toSorted(
			(left, right) =>
				left.order - right.order || left.title.localeCompare(right.title),
		);
	const description = descriptions[0];
	if (!description) throw new Error("No enabled bundled examples.");
	const file = files.find(
		(entry) =>
			entry.path === `examples/${description.id}/${description.id}.gic`,
	);
	if (!file) throw new Error("Bundled example source is missing.");
	const source = await readFile(file.fileUrl, "utf8");
	return {
		...description,
		source,
		copyText: createExampleCopyText({ ...description, source }),
	};
}
