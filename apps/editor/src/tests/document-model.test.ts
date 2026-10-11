// ABOUTME: Verifies one-document state transitions and recovery snapshot safety.
// ABOUTME: Covers portable document names, dirty state, expiry, and concurrent recovery.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	clearRecovery,
	completeDocumentSave,
	createExampleDocument,
	createRecoveredDocument,
	createUntitledDocument,
	openDocument,
	readRecovery,
	renameDocument,
	updateDocumentDescription,
	updateDocumentSource,
	writeRecovery,
} from "../lib/document-model.ts";

class MemoryStorage implements Storage {
	#values = new Map<string, string>();

	get length() {
		return this.#values.size;
	}

	clear() {
		this.#values.clear();
	}

	getItem(key: string) {
		return this.#values.get(key) ?? null;
	}

	key(index: number) {
		return [...this.#values.keys()][index] ?? null;
	}

	removeItem(key: string) {
		this.#values.delete(key);
	}

	setItem(key: string, value: string) {
		this.#values.set(key, value);
	}
}

describe("document model", () => {
	it("keeps an example unsaved until Save As and tracks later edits", () => {
		const example = createExampleDocument("repeat.gic", "point(10, 10);");

		assert.equal(example.canSave, false);
		assert.equal(example.requiresSaveAs, true);
		assert.equal(example.isDirty, false);
		assert.deepEqual(updateDocumentSource(example, "point(20, 20);"), {
			...example,
			isDirty: true,
			source: "point(20, 20);",
		});
	});

	it("marks an untitled document dirty after description-only changes", () => {
		const untitled = createUntitledDocument();

		assert.equal(untitled.isDirty, false);
		assert.equal(updateDocumentSource(untitled, ""), untitled);
		assert.equal(
			updateDocumentSource(untitled, "point(10, 10);").isDirty,
			true,
		);
		const changed = updateDocumentDescription(untitled, {
			...untitled.description,
			body: "A sketch description.",
		});
		assert.equal(changed.isDirty, true);
		assert.equal(changed.description.metadata.title, untitled.displayName);
	});

	it("starts opened sketches with isolated default metadata or loaded content", () => {
		assert.equal(openDocument("one.gic", "").description.metadata.title, "one");
		assert.equal(openDocument("one.gic", "").description.body, "");
		assert.deepEqual(
			openDocument("two.gic", "", {
				metadata: {
					title: "Two sketch",
					order: 4,
					enabled: false,
					categories: ["a, b"],
					tags: ["café"],
				},
				body: "Body",
			}).description.metadata,
			{
				title: "Two sketch",
				order: 4,
				enabled: false,
				categories: ["a, b"],
				tags: ["café"],
			},
		);
	});

	it("adopts formatted source when it was not edited after the save snapshot", () => {
		const snapshot = openDocument("motif.gic", "point(1,2);");
		const saved = openDocument(
			"motif.gic",
			"point(1, 2);",
			snapshot.description,
		);
		const advanced = completeDocumentSave(snapshot, saved, snapshot, "A", "A");

		assert.equal(advanced?.source, "point(1, 2);");
		assert.equal(advanced?.isDirty, false);
	});

	it("preserves source and description edits made after the save snapshot independently", () => {
		const initial = openDocument("motif.gic", "original");
		const snapshot = updateDocumentDescription(initial, {
			...initial.description,
			body: "Saved description",
		});
		const editedDuringSave = updateDocumentSource(
			updateDocumentDescription(snapshot, {
				...snapshot.description,
				body: "Newest description",
			}),
			"edited while saving",
		);
		const savedCopy = openDocument(
			"copy.gic",
			"formatted original",
			snapshot.description,
		);
		const advanced = completeDocumentSave(
			editedDuringSave,
			savedCopy,
			snapshot,
			"document-A",
			"document-A",
		);

		assert.ok(advanced);
		assert.equal(advanced.kind, "file");
		assert.equal(advanced.displayName, "copy.gic");
		assert.equal(advanced.baselineSource, "formatted original");
		assert.equal(advanced.source, "edited while saving");
		assert.equal(advanced.baselineDescription.body, "Saved description");
		assert.equal(advanced.description.body, "Newest description");
		assert.equal(advanced.isDirty, true);
		assert.equal(
			completeDocumentSave(
				editedDuringSave,
				savedCopy,
				snapshot,
				"document-C",
				"document-A",
			),
			undefined,
		);
	});

	it("adopts formatted source while preserving a description edit made after snapshot", () => {
		const initial = openDocument("motif.gic", "point(1,2);");
		const snapshot = updateDocumentDescription(initial, {
			...initial.description,
			body: "snapshot description",
		});
		const current = updateDocumentDescription(snapshot, {
			...snapshot.description,
			body: "later description",
		});
		const saved = openDocument(
			"motif.gic",
			"point(1, 2);",
			snapshot.description,
		);
		const advanced = completeDocumentSave(current, saved, snapshot, "A", "A");

		assert.equal(advanced?.source, "point(1, 2);");
		assert.equal(advanced?.description.body, "later description");
		assert.equal(advanced?.isDirty, true);
	});

	it("preserves a source edit while adopting saved description defaults", () => {
		const initial = openDocument("motif.gic", "source", {
			metadata: {
				title: "Custom title",
				order: 3,
				enabled: false,
				categories: ["custom"],
				tags: ["tag"],
			},
			body: "body",
		});
		const snapshot = updateDocumentDescription(initial, {
			...initial.description,
			body: "",
		});
		const current = updateDocumentSource(snapshot, "edited during save");
		const saved = openDocument("motif.gic", "source");
		const advanced = completeDocumentSave(current, saved, snapshot, "A", "A");

		assert.deepEqual(advanced?.description, saved.description);
		assert.equal(advanced?.source, "edited during save");
		assert.equal(advanced?.isDirty, true);
	});

	it("adopts saved description defaults when a blank body removed its sidecar", () => {
		const initial = openDocument("motif.gic", "source", {
			metadata: {
				title: "Custom title",
				order: 3,
				enabled: false,
				categories: ["custom"],
				tags: ["tag"],
			},
			body: "body",
		});
		const snapshot = updateDocumentDescription(initial, {
			...initial.description,
			body: "",
		});
		const saved = openDocument("motif.gic", "source");
		const advanced = completeDocumentSave(snapshot, saved, snapshot, "A", "A");

		assert.deepEqual(advanced?.description, saved.description);
		assert.equal(advanced?.isDirty, false);
	});

	it("renames the current document without discarding edits made during name lookup", () => {
		const snapshot = createUntitledDocument();
		const latest = updateDocumentDescription(
			updateDocumentSource(snapshot, "latest source"),
			{
				...snapshot.description,
				body: "latest description",
			},
		);
		const renamed = renameDocument(latest, "Untitled sketch 2");

		assert.equal(renamed.displayName, "Untitled sketch 2");
		assert.equal(renamed.source, "latest source");
		assert.equal(renamed.description.body, "latest description");
		assert.equal(renamed.isDirty, true);
	});

	it("opens a named file as a clean document", () => {
		const document = openDocument("motif.gic", "point(10, 10);");
		assert.equal(document.baselineSource, "point(10, 10);");
		assert.equal(document.canSave, true);
		assert.equal(document.displayName, "motif.gic");
		assert.equal(document.isDirty, false);
		assert.equal(document.kind, "file");
		assert.equal(document.requiresSaveAs, false);
		assert.equal(document.source, "point(10, 10);");
		assert.deepEqual(document.description, {
			metadata: {
				title: "motif",
				order: 0,
				enabled: true,
				categories: [],
				tags: [],
			},
			body: "",
		});
	});
});

describe("recovery snapshots", () => {
	const key = "gic.recovery.v1";
	const sevenDaysInMilliseconds = 7 * 24 * 60 * 60 * 1000;

	it("restores interrupted work as an unsaved dirty copy", () => {
		const storage = new MemoryStorage();
		const source = "point(10, 10);";
		assert.equal(
			writeRecovery(
				storage,
				key,
				{
					document: openDocument("motif.gic", source),
					updatedAt: 100,
				},
				0,
			),
			true,
		);

		const snapshot = readRecovery(storage, key, 101, sevenDaysInMilliseconds);
		assert.ok(snapshot);
		const recovered = createRecoveredDocument(snapshot.document);
		assert.equal(recovered.baselineSource, source);
		assert.equal(recovered.canSave, false);
		assert.equal(recovered.displayName, "Recovered sketch");
		assert.equal(recovered.isDirty, true);
		assert.equal(recovered.kind, "recovered");
		assert.equal(recovered.requiresSaveAs, true);
		assert.equal(recovered.source, source);
		assert.deepEqual(recovered.description, snapshot.document.description);
	});

	it("discards expired snapshots", () => {
		const storage = new MemoryStorage();
		writeRecovery(
			storage,
			key,
			{
				document: createUntitledDocument("point(10, 10);"),
				updatedAt: 100,
			},
			0,
		);

		assert.equal(
			readRecovery(
				storage,
				key,
				100 + sevenDaysInMilliseconds + 1,
				sevenDaysInMilliseconds,
			),
			undefined,
		);
		assert.equal(storage.getItem(key), null);
	});

	it("preserves structurally valid recovery drafts with temporarily invalid metadata", () => {
		const storage = new MemoryStorage();
		const document = openDocument("motif.gic", "point(10, 10);");
		storage.setItem(
			key,
			JSON.stringify({
				document: {
					...document,
					description: {
						...document.description,
						metadata: { ...document.description.metadata, title: "" },
						body: "Draft body",
					},
				},
				updatedAt: 200,
			}),
		);

		const snapshot = readRecovery(storage, key, 201, sevenDaysInMilliseconds);

		assert.equal(snapshot?.document.description.metadata.title, "");
		assert.equal(snapshot?.document.description.body, "Draft body");
	});

	it("fills description defaults when reading a recovery snapshot without metadata", () => {
		const storage = new MemoryStorage();
		storage.setItem(
			key,
			JSON.stringify({
				document: {
					baselineSource: "point(10, 10);",
					canSave: false,
					displayName: "motif.gic",
					isDirty: true,
					kind: "untitled",
					requiresSaveAs: true,
					source: "point(10, 10);",
				},
				updatedAt: 200,
			}),
		);

		const snapshot = readRecovery(storage, key, 201, sevenDaysInMilliseconds);

		assert.equal(snapshot?.document.description.metadata.title, "motif");
		assert.equal(snapshot?.document.description.body, "");
	});

	it("does not overwrite or clear a newer snapshot from another tab", () => {
		const storage = new MemoryStorage();
		writeRecovery(
			storage,
			key,
			{
				document: createUntitledDocument("point(10, 10);"),
				updatedAt: 200,
			},
			0,
		);

		assert.equal(
			writeRecovery(
				storage,
				key,
				{
					document: createUntitledDocument("point(20, 20);"),
					updatedAt: 201,
				},
				199,
			),
			false,
		);
		assert.equal(clearRecovery(storage, key, 199), false);
		assert.equal(
			readRecovery(storage, key, 201, sevenDaysInMilliseconds)?.document.source,
			"point(10, 10);",
		);
	});
});
