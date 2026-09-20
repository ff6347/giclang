// ABOUTME: Coordinates one active browser document, save actions, and recovery state.
// ABOUTME: Keeps React panels independent from portable file and storage operations.

import { useRef, useState } from "react";
import { applySaveFormatting } from "../../../src/language-service.ts";
import { BrowserDocumentAdapter } from "../lib/browser-document-adapter.ts";
import { productContent } from "../lib/content.ts";
import {
	createExampleDocument,
	createRecoveredDocument,
	createUntitledDocument,
	openDocument,
	updateDocumentSource,
	type DocumentState,
} from "../lib/document-model.ts";

function normalizeFileName(name: string): string {
	const trimmedName = name.trim();
	return trimmedName.endsWith(".gic") ? trimmedName : `${trimmedName}.gic`;
}

export function useDocument(
	formatOnSave: boolean,
	onExampleOpened: () => void,
) {
	const adapter = useRef(new BrowserDocumentAdapter()).current;
	const initialRecovery = useRef(adapter.readRecovery()).current;
	const knownRecoveryUpdatedAt = useRef(initialRecovery?.updatedAt ?? 0);
	const pendingReplacement = useRef<(() => Promise<void> | void) | undefined>(
		undefined,
	);
	const [documentState, setDocumentState] = useState(createUntitledDocument);
	const [saveAsOpen, setSaveAsOpen] = useState(false);
	const [discardOpen, setDiscardOpen] = useState(false);
	const [recoveryOpen, setRecoveryOpen] = useState(
		initialRecovery !== undefined,
	);

	const persistRecovery = (nextDocument: DocumentState) => {
		if (!nextDocument.isDirty) return;
		const updatedAt = Date.now();
		if (
			adapter.writeRecovery(
				nextDocument,
				updatedAt,
				knownRecoveryUpdatedAt.current,
			)
		) {
			knownRecoveryUpdatedAt.current = updatedAt;
		}
	};

	const replace = (nextDocument: DocumentState) => {
		setDocumentState(nextDocument);
	};

	const discardRecovery = () => {
		adapter.clearRecovery(knownRecoveryUpdatedAt.current);
		knownRecoveryUpdatedAt.current = 0;
	};

	const format = () => {
		const source = applySaveFormatting(documentState.source, { formatOnSave });
		if (source !== documentState.source) {
			const nextDocument = updateDocumentSource(documentState, source);
			replace(nextDocument);
			persistRecovery(nextDocument);
		}
		return source;
	};

	const save = (name: string) => {
		const source = format();
		const savedName = normalizeFileName(name);
		adapter.download(savedName, source);
		adapter.recordRecent(savedName);
		discardRecovery();
		replace(openDocument(savedName, source));
		setSaveAsOpen(false);
	};

	return {
		documentState,
		discardOpen,
		recoveryOpen,
		recentFiles: adapter.listRecent(),
		saveAsOpen,
		updateSource(source: string) {
			const nextDocument = updateDocumentSource(documentState, source);
			replace(nextDocument);
			persistRecovery(nextDocument);
		},
		requestSave() {
			if (documentState.canSave) {
				save(documentState.displayName);
				return;
			}
			setSaveAsOpen(true);
		},
		openSaveAs() {
			setSaveAsOpen(true);
		},
		saveAs(name: string) {
			save(name);
		},
		cancelSaveAs() {
			setSaveAsOpen(false);
		},
		requestOpen(file: File) {
			const open = async () => {
				const openedFile = await adapter.readFile(file);
				discardRecovery();
				adapter.recordRecent(openedFile.name);
				replace(openDocument(openedFile.name, openedFile.source));
			};
			if (documentState.isDirty) {
				pendingReplacement.current = open;
				setDiscardOpen(true);
				return;
			}
			void open();
		},
		requestExample(id: string) {
			const example = productContent.examples.find(
				(candidate) => candidate.id === id,
			);
			if (example === undefined) {
				throw new Error(`Unknown example '${id}'.`);
			}
			const open = () => {
				discardRecovery();
				replace(createExampleDocument(example.fileName, example.source));
				onExampleOpened();
			};
			if (documentState.isDirty) {
				pendingReplacement.current = open;
				setDiscardOpen(true);
				return;
			}
			open();
		},
		confirmDiscard() {
			setDiscardOpen(false);
			discardRecovery();
			const replacement = pendingReplacement.current;
			pendingReplacement.current = undefined;
			if (replacement !== undefined) void replacement();
		},
		cancelDiscard() {
			pendingReplacement.current = undefined;
			setDiscardOpen(false);
		},
		restoreRecovery() {
			if (initialRecovery !== undefined) {
				replace(createRecoveredDocument(initialRecovery.document));
			}
			setRecoveryOpen(false);
		},
		dismissRecovery() {
			discardRecovery();
			setRecoveryOpen(false);
		},
	};
}
