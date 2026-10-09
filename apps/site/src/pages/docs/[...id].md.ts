// ABOUTME: Publishes every documentation page as complete portable Markdown.
// ABOUTME: Serves the collection's exact Copy page payload without runtime requests.

import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { createDocumentationCopyText } from "@giclang/content/model";

export const getStaticPaths: GetStaticPaths = async () => {
	const docs = await getCollection("docs");
	return docs.map((entry) => ({
		params: { id: entry.id },
		props: { text: createDocumentationCopyText(entry.data) },
	}));
};

export const GET: APIRoute = ({ props }) =>
	new Response(props.text, {
		headers: { "Content-Type": "text/markdown; charset=utf-8" },
	});
