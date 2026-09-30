// ABOUTME: Defines portable one-document state and private recovery snapshots.
// ABOUTME: Keeps document transitions independent from browser and desktop file APIs.

import {
	defaultSketchDescription,
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

export function completeDocumentSave(
	current: DocumentState,
	saved: DocumentState,
	snapshot: DocumentState,
	currentIdentity: string,
	operationIdentity: string,
): DocumentState | undefined {
	if (currentIdentity !== operationIdentity) return undefined;
	return markDocumentSaved(
		{
			...saved,
			source:
				current.source === snapshot.source ? saved.source : current.source,
			description:
				JSON.stringify(current.description) ===
				JSON.stringify(snapshot.description)
					? saved.description
					: current.description,
		},
		saved,
	);
}

export function renameDocument(
	document: DocumentState,
	displayName: string,
): DocumentState {
	return { ...document, displayName };
}

export function markDocumentSaved(
	current: DocumentState,
	saved: DocumentState,
): DocumentState {
	const isDirty =
		current.source !== saved.source ||
		JSON.stringify(current.description) !== JSON.stringify(saved.description);
	return {
		...current,
		baselineSource: saved.source,
		baselineDescription: saved.description,
		isDirty,
	};
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

function isRecoveryDescription(value: unknown): value is SketchDescription {
	if (typeof value !== "object" || value === null) return false;
	if (
		!("metadata" in value) ||
		typeof value.metadata !== "object" ||
		value.metadata === null
	) {
		return false;
	}
	const metadata = value.metadata as Record<string, unknown>;
	return (
		typeof metadata.title === "string" &&
		typeof metadata.order === "number" &&
		Number.isFinite(metadata.order) &&
		typeof metadata.enabled === "boolean" &&
		Array.isArray(metadata.categories) &&
		metadata.categories.every((entry) => typeof entry === "string") &&
		Array.isArray(metadata.tags) &&
		metadata.tags.every((entry) => typeof entry === "string") &&
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
		const description = isRecoveryDescription(legacyDocument.description)
			? legacyDocument.description
			: fallback;
		const baselineDescription = isRecoveryDescription(
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
