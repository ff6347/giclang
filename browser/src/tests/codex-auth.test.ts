// ABOUTME: Verifies browser state for the Codex device authorization flow.
// ABOUTME: Ensures native events only update the matching sign-in attempt.

import assert from "node:assert/strict";
import test from "node:test";
import { beginCodexSignIn, receiveCodexAuthEvent } from "../lib/codex-auth.ts";

test("a device authorization event presents its one-time code", () => {
	const state = receiveCodexAuthEvent(beginCodexSignIn(), {
		kind: "deviceAuthorization",
		attemptId: 4,
		url: "https://untrusted.example/device",
		userCode: "ABCD-EFGH",
	});

	assert.deepEqual(state, {
		kind: "deviceAuthorization",
		attemptId: 4,
		userCode: "ABCD-EFGH",
	});
});

test("events from another attempt do not replace the active device code", () => {
	const authorization = receiveCodexAuthEvent(beginCodexSignIn(), {
		kind: "deviceAuthorization",
		attemptId: 4,
		url: "https://auth.openai.com/codex/device",
		userCode: "ABCD-EFGH",
	});
	const state = receiveCodexAuthEvent(authorization, {
		kind: "deviceAuthorization",
		attemptId: 3,
		url: "https://auth.openai.com/codex/device",
		userCode: "WXYZ-QRST",
	});

	assert.equal(state, authorization);
});

test("a matching completion ends the active sign-in attempt", () => {
	const authorization = receiveCodexAuthEvent(beginCodexSignIn(), {
		kind: "deviceAuthorization",
		attemptId: 4,
		url: "https://auth.openai.com/codex/device",
		userCode: "ABCD-EFGH",
	});
	const state = receiveCodexAuthEvent(authorization, {
		kind: "complete",
		attemptId: 4,
	});

	assert.deepEqual(state, { kind: "complete", attemptId: 4 });
});
