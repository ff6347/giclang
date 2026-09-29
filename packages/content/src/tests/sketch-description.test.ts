// ABOUTME: Verifies typed parsing and safe serialization of user descriptions.
// ABOUTME: Covers punctuation, Unicode, multiline Markdown, and shared metadata rules.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	defaultSketchDescription,
	parseSketchDescription,
	serializeSketchDescription,
} from "../sketch-description.ts";

describe("sketch descriptions", () => {
	it("round-trips user metadata and multiline Markdown", () => {
		const description = {
			metadata: {
				title: 'Mira: "orbit" — sketch',
				order: -2.5,
				enabled: false,
				categories: ["circles, lines", "藝術"],
				tags: ["a: b", "#north"],
			},
			body: "First line.\n\n<script>not trusted</script>\n最後の行。\n",
		};

		assert.deepEqual(
			parseSketchDescription(serializeSketchDescription(description)),
			description,
		);
	});

	it("defaults order, enabled, and list values while requiring a title", () => {
		assert.deepEqual(defaultSketchDescription("Orbit"), {
			metadata: {
				title: "Orbit",
				order: 0,
				enabled: true,
				categories: [],
				tags: [],
			},
			body: "",
		});
		assert.throws(
			() =>
				serializeSketchDescription({
					metadata: {
						title: " ",
						order: 0,
						enabled: true,
						categories: [],
						tags: [],
					},
					body: "body",
				}),
			/metadata is invalid/,
		);
	});
});
