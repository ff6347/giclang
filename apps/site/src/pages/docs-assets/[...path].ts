// ABOUTME: Publishes package-owned documentation assets as static site routes.
// ABOUTME: Serves the same asset bytes during development and production builds.

import { readFile } from "node:fs/promises";
import type { APIRoute, GetStaticPaths } from "astro";
import { listContentFiles } from "@giclang/content/node";

export const getStaticPaths: GetStaticPaths = async () => {
	const files = await listContentFiles("docs");
	return files
		.filter((file) => file.kind === "asset")
		.map((file) => ({
			params: { path: file.path },
			props: { fileUrl: file.fileUrl.href },
		}));
};

export const GET: APIRoute = async ({ props }) => {
	const bytes = await readFile(new URL(props.fileUrl));
	return new Response(bytes);
};
