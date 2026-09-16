import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DocumentStore } from "../document-store.js";

test("round-trips a selected path behind an opaque ID", async (t) => {
	const directory = await mkdtemp(join(tmpdir(), "gic-electron-spike-"));
	t.after(() => rm(directory, { recursive: true, force: true }));
	const path = join(directory, "round-trip.gic");
	await writeFile(path, "circle(1, 2, 3);", "utf8");

	const store = new DocumentStore();
	const opened = await store.openPath(path);
	assert.deepEqual(opened, {
		documentId: "document-0",
		name: "round-trip.gic",
		source: "circle(1, 2, 3);",
	});
	assert.equal(opened.documentId.includes(path), false);

	await store.save(opened.documentId, "circle(4, 5, 6);");
	assert.equal(await readFile(path, "utf8"), "circle(4, 5, 6);");
});

test("rejects an unknown document ID", async () => {
	const store = new DocumentStore();
	await assert.rejects(
		store.save("missing", "circle(1, 2, 3);"),
		/Unknown document ID/,
	);
});
