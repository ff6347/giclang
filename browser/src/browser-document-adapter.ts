// ABOUTME: Adapts portable browser file, download, recent, and recovery operations.
// ABOUTME: Avoids persistent filesystem handles while preserving private unsaved work.

import {
	clearRecovery,
	readRecovery,
	writeRecovery,
	type DocumentState,
	type RecoverySnapshot,
} from "./document-model.ts";

const RECENT_FILES_KEY = "gic.recent-files.v1";
export const RECOVERY_KEY = "gic.recovery.v1";
export const RECOVERY_MAX_AGE_IN_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;

export interface OpenedFile {
	readonly name: string;
	readonly source: string;
}

export interface DocumentAdapter {
	clearRecovery(knownUpdatedAt: number): boolean;
	download(name: string, source: string): void;
	listRecent(): string[];
	readFile(file: File): Promise<OpenedFile>;
	readRecovery(): RecoverySnapshot | undefined;
	recordRecent(name: string): void;
	writeRecovery(
		document: DocumentState,
		updatedAt: number,
		knownUpdatedAt: number,
	): boolean;
}

function normalizeFileName(name: string): string {
	const trimmedName = name.trim();
	return trimmedName.endsWith(".gic") ? trimmedName : `${trimmedName}.gic`;
}

function parseRecentFiles(value: string | null): string[] {
	if (value === null) {
		return [];
	}
	try {
		const names: unknown = JSON.parse(value);
		if (!Array.isArray(names)) {
			return [];
		}
		return names.filter(
			(name): name is string =>
				typeof name === "string" && name.endsWith(".gic"),
		);
	} catch {
		return [];
	}
}

export class BrowserDocumentAdapter implements DocumentAdapter {
	readonly #storage: Storage;

	constructor(storage = localStorage) {
		this.#storage = storage;
	}

	clearRecovery(knownUpdatedAt: number): boolean {
		return clearRecovery(this.#storage, RECOVERY_KEY, knownUpdatedAt);
	}

	download(name: string, source: string): void {
		const blob = new Blob([source], { type: "text/plain;charset=utf-8" });
		const link = document.createElement("a");
		link.download = normalizeFileName(name);
		link.href = URL.createObjectURL(blob);
		link.click();
		window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
	}

	listRecent(): string[] {
		return parseRecentFiles(this.#storage.getItem(RECENT_FILES_KEY));
	}

	async readFile(file: File): Promise<OpenedFile> {
		return {
			name: normalizeFileName(file.name),
			source: await file.text(),
		};
	}

	readRecovery(): RecoverySnapshot | undefined {
		return readRecovery(
			this.#storage,
			RECOVERY_KEY,
			Date.now(),
			RECOVERY_MAX_AGE_IN_MILLISECONDS,
		);
	}

	recordRecent(name: string): void {
		const normalizedName = normalizeFileName(name);
		const recentFiles = this.listRecent().filter(
			(recentName) => recentName !== normalizedName,
		);
		recentFiles.unshift(normalizedName);
		this.#storage.setItem(
			RECENT_FILES_KEY,
			JSON.stringify(recentFiles.slice(0, 10)),
		);
	}

	writeRecovery(
		document: DocumentState,
		updatedAt: number,
		knownUpdatedAt: number,
	): boolean {
		return writeRecovery(
			this.#storage,
			RECOVERY_KEY,
			{
				document,
				updatedAt,
			},
			knownUpdatedAt,
		);
	}
}
