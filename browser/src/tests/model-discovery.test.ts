// ABOUTME: Verifies model-discovery errors are actionable without exposing provider text.
// ABOUTME: Keeps credential, network, and malformed-catalog failures distinct.

import assert from "node:assert/strict";
import test from "node:test";
import { modelDiscoveryError } from "../lib/model-discovery.ts";

test("rejected Zen keys retain actionable guidance", () => {
	const message = modelDiscoveryError(
		"OpenCode request failed (HTTP 401): the API key was rejected. Reconnect OpenCode with a valid key.",
	);
	assert.match(message, /HTTP 401/);
	assert.match(message, /reconnect/i);
});

test("malformed catalogs are distinct from lost connectivity", () => {
	assert.match(
		modelDiscoveryError("OpenCode returned an invalid model list."),
		/invalid model list/i,
	);
	assert.match(
		modelDiscoveryError(
			"OpenCode models request could not reach the provider: connection failed.",
		),
		/network|connection/i,
	);
});

test("rate-limited discovery advises retrying later", () => {
	const message = modelDiscoveryError(
		"OpenCode request failed (HTTP 429): the request was rate-limited. Try again later.",
	);
	assert.match(message, /HTTP 429/);
	assert.match(message, /later/i);
});

test("untrusted failures do not expose provider or credential text", () => {
	const message = modelDiscoveryError(
		"OpenCode request failed (HTTP 401): Bearer synthetic-secret",
	);
	assert.doesNotMatch(message, /synthetic-secret|Bearer/);
	assert.match(message, /HTTP 401/);
});
