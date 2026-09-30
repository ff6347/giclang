// ABOUTME: Verifies preview source ownership across jobs and successful saves.
// ABOUTME: Covers stale completion rejection, adoption, and newer draft isolation.

import assert from "node:assert/strict";
import test from "node:test";
import { PreviewSource } from "../lib/preview-source.ts";

test("adopts formatting only for the accepted preview from the saved run", () => {
	const preview = new PreviewSource();
	const run = preview.begin("unformatted");
	assert.equal(preview.accept(run, "unformatted"), true);

	assert.deepEqual(preview.adoptSavedSource("unformatted", "formatted"), {
		accepted: true,
		invalidatedRun: undefined,
		previewRequired: false,
	});
	assert.equal(preview.isAccepted("formatted"), true);
	assert.equal(preview.isAccepted("unformatted"), false);
});

test("invalidates pending source work when a successful save adopts formatting", () => {
	const preview = new PreviewSource();
	const pendingRun = preview.begin("unformatted");

	assert.deepEqual(preview.adoptSavedSource("unformatted", "formatted"), {
		accepted: false,
		invalidatedRun: pendingRun,
		previewRequired: true,
	});
	assert.equal(preview.accept(pendingRun, "unformatted"), false);
	assert.equal(preview.isAccepted("formatted"), false);
});

test("does not adopt over a newer draft preview or accept a superseded run", () => {
	const preview = new PreviewSource();
	const oldRun = preview.begin("unformatted");
	const newerRun = preview.begin("newer draft");
	assert.equal(preview.accept(oldRun, "unformatted"), false);

	assert.deepEqual(preview.adoptSavedSource("unformatted", "formatted"), {
		accepted: false,
		invalidatedRun: undefined,
		previewRequired: false,
	});
	assert.equal(preview.accept(newerRun, "newer draft"), true);
	assert.equal(preview.isAccepted("newer draft"), true);
});

test("refreshes a completed failed preview after formatting is adopted", () => {
	const preview = new PreviewSource();
	const failedRun = preview.begin("unformatted");
	preview.fail(failedRun);

	assert.deepEqual(preview.adoptSavedSource("unformatted", "formatted"), {
		accepted: false,
		invalidatedRun: undefined,
		previewRequired: true,
	});
});

test("keeps a pending same-source preview when saving does not change the source", () => {
	const preview = new PreviewSource();
	const pendingRun = preview.begin("unchanged");

	assert.deepEqual(preview.adoptSavedSource("unchanged", "unchanged"), {
		accepted: false,
		invalidatedRun: undefined,
		previewRequired: false,
	});
	assert.equal(preview.accept(pendingRun, "unchanged"), true);
});
