// ABOUTME: Verifies one-document state transitions and recovery snapshot safety.
// ABOUTME: Covers portable document names, dirty state, expiry, and concurrent recovery.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	clearRecovery,
	createExampleDocument,
	createRecoveredDocument,
	createUntitledDocument,
	openDocument,
	readRecovery,
	updateDocumentSource,
	writeRecovery,
} from "./document-model.ts";

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

	it("marks an untitled document dirty only after its source changes", () => {
		const untitled = createUntitledDocument();

		assert.equal(untitled.isDirty, false);
		assert.equal(updateDocumentSource(untitled, ""), untitled);
		assert.equal(
			updateDocumentSource(untitled, "point(10, 10);").isDirty,
			true,
		);
	});

	it("opens a named file as a clean document", () => {
		assert.deepEqual(openDocument("motif.gic", "point(10, 10);"), {
			baselineSource: "point(10, 10);",
			canSave: true,
			displayName: "motif.gic",
			isDirty: false,
			kind: "file",
			requiresSaveAs: false,
			source: "point(10, 10);",
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
		assert.deepEqual(createRecoveredDocument(snapshot.document), {
			baselineSource: source,
			canSave: false,
			displayName: "Recovered sketch",
			isDirty: true,
			kind: "recovered",
			requiresSaveAs: true,
			source,
		});
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
