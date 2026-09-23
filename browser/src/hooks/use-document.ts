// ABOUTME: Coordinates one active browser document, save actions, and recovery state.
// ABOUTME: Keeps React panels independent from portable file and storage operations.

import { useRef, useState } from "react";
import { applySaveFormatting } from "../../../src/language-service.ts";
import { BrowserDocumentAdapter } from "../lib/browser-document-adapter.ts";
import { productContent } from "../lib/content.ts";
import { nextSketchName } from "../lib/sketch-naming.ts";
import type { DesktopHost } from "../lib/desktop-host.ts";
import {
	createExampleDocument,
	createNewSketchDocument,
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
	desktop: DesktopHost | undefined,
) {
	const adapter = useRef(new BrowserDocumentAdapter()).current;
	const desktopDocumentId = useRef<string | undefined>(undefined);
	const newSketchNames = useRef(new Set<string>()).current;
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

	const replaceDocument = (
		nextDocument: DocumentState,
		documentId?: string,
	) => {
		desktopDocumentId.current = documentId;
		replace(nextDocument);
	};

	const discardRecovery = () => {
		adapter.clearRecovery(knownRecoveryUpdatedAt.current);
		knownRecoveryUpdatedAt.current = 0;
	};

	const sourceForSave = () =>
		applySaveFormatting(documentState.source, { formatOnSave });

	const saveBrowserDocument = (name: string) => {
		const source = sourceForSave();
		const savedName = normalizeFileName(name);
		adapter.download(savedName, source);
		adapter.recordRecent(savedName);
		discardRecovery();
		replaceDocument(openDocument(savedName, source));
		setSaveAsOpen(false);
	};

	const saveDesktopDocumentAs = async () => {
		if (desktop === undefined) return;
		const source = sourceForSave();
		const suggestedName = documentState.displayName.endsWith(".gic")
			? documentState.displayName
			: `${documentState.displayName}.gic`;
		const saved = await desktop.saveDocumentAs(source, suggestedName);
		if (saved === null) return;
		discardRecovery();
		replaceDocument(openDocument(saved.name, saved.source), saved.documentId);
	};

	const saveDesktopDocument = async () => {
		if (desktop === undefined) return;
		const documentId = desktopDocumentId.current;
		if (!documentState.canSave || documentId === undefined) {
			await saveDesktopDocumentAs();
			return;
		}
		const source = sourceForSave();
		await desktop.saveDocument(documentId, source);
		discardRecovery();
		replace(openDocument(documentState.displayName, source));
	};

	const runDesktopOperation = (operation: () => Promise<void>) => {
		void operation().catch(() => {
			window.alert("GIC could not complete the desktop file operation.");
		});
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
		requestNew() {
			const name = nextSketchName(newSketchNames, new Date());
			newSketchNames.add(name);
			const open = () => {
				discardRecovery();
				replaceDocument(createNewSketchDocument(name));
			};
			if (documentState.isDirty) {
				pendingReplacement.current = open;
				setDiscardOpen(true);
				return;
			}
			open();
		},
		requestSave() {
			if (desktop !== undefined) {
				runDesktopOperation(saveDesktopDocument);
				return;
			}
			if (documentState.canSave) {
				saveBrowserDocument(documentState.displayName);
				return;
			}
			setSaveAsOpen(true);
		},
		openSaveAs() {
			if (desktop !== undefined) {
				runDesktopOperation(saveDesktopDocumentAs);
				return;
			}
			setSaveAsOpen(true);
		},
		saveAs(name: string) {
			saveBrowserDocument(name);
		},
		cancelSaveAs() {
			setSaveAsOpen(false);
		},
		requestOpen(file: File) {
			const open = async () => {
				const openedFile = await adapter.readFile(file);
				discardRecovery();
				adapter.recordRecent(openedFile.name);
				replaceDocument(openDocument(openedFile.name, openedFile.source));
			};
			if (documentState.isDirty) {
				pendingReplacement.current = open;
				setDiscardOpen(true);
				return;
			}
			void open();
		},
		requestDesktopOpen() {
			if (desktop === undefined) return;
			const chooseDocument = async () => {
				const openedDocument = await desktop.openDocument();
				if (openedDocument === null) return;
				const open = () => {
					discardRecovery();
					replaceDocument(
						openDocument(openedDocument.name, openedDocument.source),
						openedDocument.documentId,
					);
				};
				if (documentState.isDirty) {
					pendingReplacement.current = open;
					setDiscardOpen(true);
					return;
				}
				open();
			};
			runDesktopOperation(chooseDocument);
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
				replaceDocument(
					createExampleDocument(example.fileName, example.source),
				);
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
				replaceDocument(createRecoveredDocument(initialRecovery.document));
			}
			setRecoveryOpen(false);
		},
		dismissRecovery() {
			discardRecovery();
			setRecoveryOpen(false);
		},
	};
}
