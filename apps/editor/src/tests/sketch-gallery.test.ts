// ABOUTME: Verifies saved gallery visibility, metadata validation, and card ordering.
// ABOUTME: Uses serialized descriptions matching real saved sketch bundles.

import assert from "node:assert/strict";
import test from "node:test";
import {
	prepareSketchCards,
	type SketchCandidate,
} from "../lib/sketch-gallery.ts";

function candidate(
	entryId: string,
	title: string,
	order: number,
	enabled = true,
	thumbnailDataUrl: string | null = null,
): SketchCandidate {
	return {
		entryId,
		thumbnailDataUrl,
		description: `---\ntitle: ${title}\norder: ${order}\nenabled: ${enabled}\ncategories: []\ntags: []\n---\n\nSaved ${title}.`,
	};
}

test("shows valid enabled sketches with an optional image sorted by order and title", () => {
	const cards = prepareSketchCards([
		candidate(
			"later",
			"Later",
			2,
			true,
			"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAABAUlEQVR4nO3RMREAIBDAsBeAClTg3xjIoEOG7L3rrH0uHfM7AEPSDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIkxJMaQGENiDIl5k8J8e/Qt310AAAAASUVORK5CYII=",
		),
		candidate("zulu", "Zulu", 1),
		candidate("alpha", "Alpha", 1),
		candidate("disabled", "Hidden", 0, false),
		{
			entryId: "malformed",
			description: "not YAML frontmatter",
			thumbnailDataUrl: null,
		},
	]);

	assert.deepEqual(
		cards.map(({ entryId }) => entryId),
		["alpha", "zulu", "later"],
	);
	assert.equal(cards[0]?.thumbnailDataUrl, null);
	assert.ok(
		cards[2]?.thumbnailDataUrl?.startsWith("data:image/png;base64,iVBORw0KGgo"),
	);
});
