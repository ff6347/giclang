// ABOUTME: Publishes every public documentation body once as a complete UTF-8 export.
// ABOUTME: Serves the same portable text used by the site's Copy all docs control.

import type { APIRoute } from "astro";
import { documentationFullText } from "../lib/documentation-exports.ts";

export const GET: APIRoute = async () =>
	new Response(await documentationFullText(), {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
