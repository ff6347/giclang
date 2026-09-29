// ABOUTME: Verifies native operation recovery details reach the user as text.
// ABOUTME: Covers native string errors and unexpected failure fallbacks.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { desktopOperationMessage } from "../lib/desktop-operation-message.ts";

describe("desktop operation messages", () => {
	it("preserves the native recovery instructions", () => {
		const recoveryError =
			"Sketch save failed and rollback was incomplete. Recover files at /safe/recovery.";
		assert.equal(desktopOperationMessage(recoveryError), recoveryError);
	});

	it("uses a generic message for empty or unstructured failures", () => {
		assert.equal(
			desktopOperationMessage({ reason: "failure" }),
			"GIC could not complete the desktop file operation.",
		);
		assert.equal(
			desktopOperationMessage("  "),
			"GIC could not complete the desktop file operation.",
		);
	});
});
