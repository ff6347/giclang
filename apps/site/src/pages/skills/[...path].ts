// ABOUTME: Publishes the canonical GiC skill sources and archive as static routes.
// ABOUTME: Emits only the website-owned ZIP and combined plaintext paths.

import { Buffer } from "node:buffer";
import type { APIRoute, GetStaticPaths } from "astro";
import { readGicAgentExport } from "@giclang/content/node";

export const getStaticPaths: GetStaticPaths = () => [
	{ params: { path: "gic-agent.zip" } },
	{ params: { path: "gic-agent.txt" } },
];

export const GET: APIRoute = async ({ params }) => {
	if (params.path === "gic-agent.zip") {
		const { archiveBase64 } = await readGicAgentExport();
		return new Response(Buffer.from(archiveBase64, "base64"), {
			headers: {
				"Content-Type": "application/zip",
				"Content-Disposition": 'attachment; filename="gic-agent.zip"',
			},
		});
	}

	if (params.path === "gic-agent.txt") {
		const { rawText } = await readGicAgentExport();
		return new Response(rawText, {
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	}

	return new Response(null, { status: 404 });
};
