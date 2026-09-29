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

	it("advances the saved baseline without losing edits made during the save", () => {
		const initial = openDocument("motif.gic", "original");
		const saveSnapshot = updateDocumentDescription(initial, {
			...initial.description,
			body: "Saved description",
		});
		const editedDuringSave = updateDocumentSource(
			updateDocumentDescription(saveSnapshot, {
				...saveSnapshot.description,
				body: "Newest description",
			}),
			"edited while saving",
		);

		const savedCopy = openDocument(
			"copy.gic",
			"original",
			saveSnapshot.description,
		);
		const advanced = completeDocumentSave(
			editedDuringSave,
			savedCopy,
			"document-A",
			"document-A",
		);
		assert.ok(advanced);

		assert.equal(advanced.kind, "file");
		assert.equal(advanced.displayName, "copy.gic");
		assert.equal(advanced.baselineSource, "original");
		assert.equal(advanced.source, "edited while saving");
		assert.equal(advanced.baselineDescription.body, "Saved description");
		assert.equal(advanced.description.body, "Newest description");
		assert.equal(advanced.isDirty, true);
		assert.equal(
			completeDocumentSave(
				editedDuringSave,
				saveSnapshot,
				"document-C",
				"document-A",
			),
			undefined,
		);
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
