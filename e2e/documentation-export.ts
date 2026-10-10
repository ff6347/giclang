// ABOUTME: Reads ordered bundled documentation as independent export acceptance inputs.
// ABOUTME: Assembles canonical full text without using production export serialization.

import { readBundledDocumentation } from "./documentation-copy.ts";
import { listContentFiles } from "../packages/content/src/content-files.ts";

export async function readBundledDocumentationExport() {
	const files = await listContentFiles("docs");
	const docs = await Promise.all(
		files.flatMap((file) => {
			if (file.kind !== "markdown") return [];
			const order = file.frontmatter["order"];
			if (typeof order !== "number")
				throw new Error(`Missing documentation order '${file.path}'.`);
			const id = file.path.slice("docs/".length, -".md".length);
			return [readBundledDocumentation(id).then((doc) => ({ ...doc, order }))];
		}),
	);
	docs.sort(
		(left, right) =>
			left.order - right.order || left.title.localeCompare(right.title),
	);
	return {
		docs,
		fullText:
			"# GiC documentation\n\n" +
			docs
				.map(
					(doc) =>
						`# ${doc.title}\n\nSource: https://giclang.cc/docs/${doc.id}.md\n\n${doc.markdown}`,
				)
				.join("\n\n---\n\n"),
	};
}
