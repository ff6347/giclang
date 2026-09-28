// ABOUTME: Checks local documentation links against bundled page identities.
// ABOUTME: Distinguishes missing documentation from links handled by the browser.

import assert from "node:assert/strict";
import test from "node:test";
import { documentationTargetId } from "../lib/documentation-links.ts";

const docs = new Set(["colors", "colors-named", "topics/drawing"]);

test("resolves relative links to a bundled page, including nested pages", () => {
	assert.equal(
		documentationTargetId("colors", "./colors-named.md", docs),
		"colors-named",
	);
	assert.equal(
		documentationTargetId("topics/drawing", "../colors.md", docs),
		"colors",
	);
});

test("marks missing or out-of-bundle Markdown targets as unavailable", () => {
	assert.equal(documentationTargetId("colors", "./missing.md", docs), null);
	assert.equal(documentationTargetId("colors", "../../outside.md", docs), null);
	assert.equal(documentationTargetId("colors", "./%ZZ.md", docs), null);
});

test("leaves external links and non-page links to their existing behavior", () => {
	for (const href of [
		"https://example.org/colors.md",
		"mailto:info@example.org",
		"#colors",
		"./images/swatches.png",
	]) {
		assert.equal(documentationTargetId("colors", href, docs), undefined);
	}
});
