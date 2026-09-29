// ABOUTME: Defines portable one-document state and private recovery snapshots.
// ABOUTME: Keeps document transitions independent from browser and desktop file APIs.

import {
	defaultSketchDescription,
	isSketchDescriptionMetadata,
	type SketchDescription,
} from "@giclang/content/sketch-description";

export type DocumentKind = "example" | "file" | "recovered" | "untitled";

export interface DocumentState {
	readonly baselineDescription: SketchDescription;
	readonly baselineSource: string;
	readonly canSave: boolean;
	readonly displayName: string;
	readonly description: SketchDescription;
	readonly isDirty: boolean;
	readonly kind: DocumentKind;
	readonly requiresSaveAs: boolean;
	readonly source: string;
}

export interface RecoverySnapshot {
	readonly document: DocumentState;
	readonly updatedAt: number;
}

function createDocument(
	kind: DocumentKind,
	displayName: string,
	source: string,
	canSave: boolean,
	requiresSaveAs: boolean,
	isDirty = false,
	description = defaultSketchDescription(displayName.replace(/\.gic$/i, "")),
): DocumentState {
	return {
		baselineDescription: description,
		baselineSource: source,
		canSave,
		displayName,
		description,
		isDirty,
		kind,
		requiresSaveAs,
		source,
	};
}

export function createUntitledDocument(source = ""): DocumentState {
	return createDocument("untitled", "Untitled sketch", source, false, true);
}

export function createNewSketchDocument(name: string): DocumentState {
	return createDocument("untitled", name, "", false, true);
}

export function openDocument(
	name: string,
	source: string,
	description?: SketchDescription,
): DocumentState {
	return createDocument("file", name, source, true, false, false, description);
}

export function createExampleDocument(
	name: string,
	source: string,
): DocumentState {
	return createDocument("example", name, source, false, true);
}

export function createRecoveredDocument(
	document: DocumentState,
): DocumentState {
	return createDocument(
		"recovered",
		"Recovered sketch",
		document.source,
		false,
		true,
		true,
		document.description,
	);
}

export function updateDocumentSource(
	document: DocumentState,
	source: string,
): DocumentState {
	if (source === document.source) {
		return document;
	}
	return {
		...document,
		isDirty:
			source !== document.baselineSource ||
			JSON.stringify(document.description) !==
				JSON.stringify(document.baselineDescription),
		source,
	};
}

export function updateDocumentDescription(
	document: DocumentState,
	description: SketchDescription,
): DocumentState {
	if (JSON.stringify(description) === JSON.stringify(document.description)) {
		return document;
	}
	return {
		...document,
		description,
		isDirty:
			document.source !== document.baselineSource ||
			JSON.stringify(description) !==
				JSON.stringify(document.baselineDescription),
	};
}

function isSketchDescription(value: unknown): value is SketchDescription {
	return (
		typeof value === "object" &&
		value !== null &&
		"metadata" in value &&
		isSketchDescriptionMetadata(value.metadata) &&
		"body" in value &&
		typeof value.body === "string"
	);
}

function parseSnapshot(value: string | null): RecoverySnapshot | undefined {
	if (value === null) {
		return undefined;
	}

	try {
		const snapshot: unknown = JSON.parse(value);
		if (
			typeof snapshot !== "object" ||
			snapshot === null ||
			!("document" in snapshot) ||
			!("updatedAt" in snapshot) ||
			typeof snapshot.updatedAt !== "number"
		) {
			return undefined;
		}
		const document = snapshot.document;
		if (
			typeof document !== "object" ||
			document === null ||
			!("source" in document) ||
			typeof document.source !== "string"
		) {
			return undefined;
		}
		const legacyDocument = document as Record<string, unknown>;
		const title =
			typeof legacyDocument.displayName === "string"
				? legacyDocument.displayName.replace(/\.gic$/i, "")
				: "Recovered sketch";
		const fallback = defaultSketchDescription(title);
		const description = isSketchDescription(legacyDocument.description)
			? legacyDocument.description
			: fallback;
		const baselineDescription = isSketchDescription(
			legacyDocument.baselineDescription,
		)
			? legacyDocument.baselineDescription
			: fallback;
		return {
			...(snapshot as RecoverySnapshot),
			document: {
				...(legacyDocument as unknown as DocumentState),
				description,
				baselineDescription,
			},
		};
	} catch {
		return undefined;
	}
}

export function readRecovery(
	storage: Storage,
	key: string,
	now: number,
	maxAgeInMilliseconds: number,
): RecoverySnapshot | undefined {
	const snapshot = parseSnapshot(storage.getItem(key));
	if (
		snapshot === undefined ||
		now - snapshot.updatedAt > maxAgeInMilliseconds
	) {
		storage.removeItem(key);
		return undefined;
	}
	return snapshot;
}

export function writeRecovery(
	storage: Storage,
	key: string,
	snapshot: RecoverySnapshot,
	knownUpdatedAt: number,
): boolean {
	const current = parseSnapshot(storage.getItem(key));
	if (current !== undefined && current.updatedAt > knownUpdatedAt) {
		return false;
	}
	storage.setItem(key, JSON.stringify(snapshot));
	return true;
}

export function clearRecovery(
	storage: Storage,
	key: string,
	knownUpdatedAt: number,
): boolean {
	const current = parseSnapshot(storage.getItem(key));
	if (current !== undefined && current.updatedAt > knownUpdatedAt) {
		return false;
	}
	storage.removeItem(key);
	return true;
}
