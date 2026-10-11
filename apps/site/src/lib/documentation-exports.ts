// ABOUTME: Assembles the site's complete portable documentation export from its collection.
// ABOUTME: Keeps public source URLs canonical across copying and deployment bases.

import { getCollection } from "astro:content";
import { createDocumentationFullText } from "@giclang/content/model";

export async function documentationFullText(): Promise<string> {
	const docs = await getCollection("docs");
	return createDocumentationFullText(
		docs.map((entry) => ({ id: entry.id, ...entry.data })),
		(id) => `https://giclang.cc/docs/${id}.md`,
	);
}
