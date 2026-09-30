// ABOUTME: Verifies user-authored sketch Markdown cannot emit active or remote content.
// ABOUTME: Pins inert links, disabled images, and escaped authored HTML.

import assert from "node:assert/strict";
import test from "node:test";
import { renderUserMarkdown } from "../user-markdown.ts";

test("renders user Markdown without HTML, active links, or remote images", () => {
	const html = renderUserMarkdown(
		"<script>window.compromised = true</script>\n\n" +
			"[javascript](javascript:alert(1)) [local](file:///etc/passwd)\n\n" +
			"![secret](file:///etc/passwd) ![remote](https://example.com/image.png)",
	);

	assert.doesNotMatch(html, /<script|href=|src=|onerror=/i);
	assert.match(html, /&lt;script&gt;/);
	assert.match(html, /javascript/);
	assert.match(html, /file:\/\/\/etc\/passwd/);
	assert.match(html, /secret/);
	assert.match(html, /remote/);
});
