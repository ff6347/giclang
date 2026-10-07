// ABOUTME: Publishes the canonical GiC skill sources and archive as static routes.
// ABOUTME: Emits only the three website-owned skill download and inspection paths.

import { Buffer } from "node:buffer";
import type { APIRoute, GetStaticPaths } from "astro";
import { readGicAgentExport, readGicAgentSkill } from "@giclang/content/node";

export const getStaticPaths: GetStaticPaths = () => [
	{ params: { path: "gic-agent.zip" } },
	{ params: { path: "gic-agent/SKILL.md" } },
	{ params: { path: "gic-agent/references/language.md" } },
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

	if (
		params.path === "gic-agent/SKILL.md" ||
		params.path === "gic-agent/references/language.md"
	) {
		const { skillSource, referenceSource } = await readGicAgentSkill();
		const source =
			params.path === "gic-agent/SKILL.md" ? skillSource : referenceSource;
		return new Response(source, {
			headers: { "Content-Type": "text/markdown; charset=utf-8" },
		});
	}

	return new Response(null, { status: 404 });
};
