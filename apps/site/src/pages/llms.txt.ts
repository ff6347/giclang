// ABOUTME: Publishes the complete public documentation index as UTF-8 text.
// ABOUTME: Resolves relative Markdown and full-text links from the deployment's index location.

import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { createDocumentationIndex } from "@giclang/content/model";

export const GET: APIRoute = async () => {
	const docs = await getCollection("docs");
	const text = createDocumentationIndex(
		docs.map((entry) => ({ id: entry.id, ...entry.data })),
		(id) => `docs/${id}.md`,
		"llms-full.txt",
	);
	return new Response(text, {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
};
