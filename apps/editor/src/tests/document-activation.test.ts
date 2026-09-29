// ABOUTME: Verifies exclusive ownership of native document activation.
// ABOUTME: Exercises delayed operations and owner-scoped busy-state cleanup.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DocumentActivation } from "../lib/document-activation.ts";

describe("document activation", () => {
	it("rejects delayed activation while another operation owns native acceptance", () => {
		const activation = new DocumentActivation();
		const first = activation.acquire();

		assert.ok(first);
		assert.equal(activation.isPending, true);
		assert.equal(activation.acquire(), undefined);
		assert.equal(activation.isPending, true);
		assert.equal(activation.release(Symbol("other operation")), false);
		assert.equal(activation.isPending, true);
		assert.equal(activation.release(first), true);
		assert.equal(activation.isPending, false);
	});
});
