// ABOUTME: Coordinates one active browser document, save actions, and recovery state.
// ABOUTME: Keeps React panels independent from portable file and storage operations.

import { useEffect, useRef, useState } from "react";
import { applySaveFormatting } from "@giclang/core/language-service";
import {
	defaultSketchDescription,
	parseSketchDescription,
	serializeSketchDescription,
	type SketchDescription,
} from "@giclang/content/sketch-description";
import { BrowserDocumentAdapter } from "../lib/browser-document-adapter.ts";
import { productContent } from "../lib/content.ts";
import { nextSketchName } from "../lib/sketch-naming.ts";
import type { DesktopHost } from "../lib/desktop-host.ts";
import {
	createExampleDocument,
	createNewSketchDocument,
	createRecoveredDocument,
	openDocument,
	updateDocumentDescription,
	updateDocumentSource,
	type DocumentState,
} from "../lib/document-model.ts";

function normalizeFileName(name: string): string {
	const trimmedName = name.trim();
	return trimmedName.endsWith(".gic") ? trimmedName : `${trimmedName}.gic`;
}

function sketchBaseName(name: string): string {
	return name.endsWith(".gic") ? name.slice(0, -".gic".length) : name;
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
	const [documentState, setDocumentState] = useState(() => {
		const name = nextSketchName(newSketchNames, new Date());
		newSketchNames.add(name);
		return createNewSketchDocument(name);
	});
	const [sketchId, setSketchId] = useState(() => documentState.displayName);
	const [documentId, setDocumentId] = useState<string | undefined>(undefined);
	const initialSketchName = useRef(documentState.displayName).current;
	const documentStateRef = useRef(documentState);
	documentStateRef.current = documentState;
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
		nextSketchId?: string,
	) => {
		desktopDocumentId.current = documentId;
		setDocumentId(documentId);
		setSketchId(nextSketchId ?? nextDocument.displayName);
		replace(nextDocument);
	};

	const discardRecovery = () => {
		adapter.clearRecovery(knownRecoveryUpdatedAt.current);
		knownRecoveryUpdatedAt.current = 0;
	};

	const sourceForSave = () =>
		applySaveFormatting(documentState.source, { formatOnSave });
	const descriptionForSave = (): string | null =>
		documentState.description.body.trim() === ""
			? null
			: serializeSketchDescription(documentState.description);
	const descriptionFromSidecar = (
		name: string,
		sidecar: string | null | undefined,
	): SketchDescription =>
		sidecar === null || sidecar === undefined
			? defaultSketchDescription(sketchBaseName(name))
			: parseSketchDescription(sidecar);

	const nextAvailableSketchName = async (): Promise<string> => {
		const takenNames = new Set(newSketchNames);
		if (desktop !== undefined) {
			for (const name of await desktop.existingSketchNames()) {
				takenNames.add(name);
			}
		}
		const name = nextSketchName(takenNames, new Date());
		newSketchNames.add(name);
		return name;
	};

	const saveBrowserDocument = (name: string) => {
		const source = sourceForSave();
		const savedName = normalizeFileName(name);
		adapter.download(savedName, source);
		adapter.recordRecent(savedName);
		const savedDocument = updateDocumentDescription(
			openDocument(savedName, source),
			documentState.description,
		);
		replaceDocument(savedDocument, undefined, savedName);
		if (savedDocument.isDirty) persistRecovery(savedDocument);
		else discardRecovery();
		setSaveAsOpen(false);
	};

	const saveDesktopDocumentAs = async () => {
		if (desktop === undefined) return;
		const source = sourceForSave();
		let suggestedName = documentState.displayName.endsWith(".gic")
			? documentState.displayName.slice(0, -".gic".length)
			: documentState.displayName;
		if (documentState.kind === "untitled") {
			const existingNames = await desktop.existingSketchNames();
			if (existingNames.includes(suggestedName)) {
				const takenNames = new Set(existingNames);
				for (const name of newSketchNames) {
					if (name !== suggestedName) takenNames.add(name);
				}
				suggestedName = nextSketchName(takenNames, new Date());
				newSketchNames.delete(documentState.displayName);
				newSketchNames.add(suggestedName);
				setDocumentState({ ...documentState, displayName: suggestedName });
			}
		}
		const saved = await desktop.saveDocumentAs(
			source,
			suggestedName,
			descriptionForSave(),
		);
		if (saved === null) return;
		discardRecovery();
		replaceDocument(
			openDocument(
				sketchBaseName(saved.name),
				saved.source,
				descriptionFromSidecar(saved.name, saved.description),
			),
			saved.documentId,
			saved.sketchId,
		);
	};

	useEffect(() => {
		if (desktop === undefined) return;
		let disposed = false;
		void desktop
			.existingSketchNames()
			.then((existingNames) => {
				if (disposed) return;
				const current = documentStateRef.current;
				if (
					current.kind !== "untitled" ||
					current.displayName !== initialSketchName
				) {
					return;
				}
				const takenNames = new Set(existingNames);
				for (const name of newSketchNames) {
					if (name !== initialSketchName) takenNames.add(name);
				}
				const name = nextSketchName(takenNames, new Date());
				if (name === initialSketchName) return;
				newSketchNames.delete(initialSketchName);
				newSketchNames.add(name);
				setDocumentState({ ...current, displayName: name });
			})
			.catch(() => {});
		return () => {
			disposed = true;
		};
	}, [desktop, initialSketchName, newSketchNames]);

	const saveDesktopDocument = async () => {
		if (desktop === undefined) return;
		const documentId = desktopDocumentId.current;
		if (!documentState.canSave || documentId === undefined) {
			await saveDesktopDocumentAs();
			return;
		}
		const source = sourceForSave();
		await desktop.saveDocument(documentId, source, descriptionForSave());
		discardRecovery();
		replace(
			openDocument(
				documentState.displayName,
				source,
				documentState.description.body.trim() === ""
					? defaultSketchDescription(sketchBaseName(documentState.displayName))
					: documentState.description,
			),
		);
	};

	const runDesktopOperation = (operation: () => Promise<void>) => {
		void operation().catch(() => {
			window.alert("GIC could not complete the desktop file operation.");
		});
	};

	return {
		documentState,
		documentId,
		sketchId,
		discardOpen,
		recoveryOpen,
		recentFiles: adapter.listRecent(),
		saveAsOpen,
		updateSource(source: string) {
			const nextDocument = updateDocumentSource(documentState, source);
			replace(nextDocument);
			persistRecovery(nextDocument);
		},
		updateDescription(description: SketchDescription) {
			const nextDocument = updateDocumentDescription(
				documentState,
				description,
			);
			replace(nextDocument);
			persistRecovery(nextDocument);
		},
		requestNew() {
			const open = async () => {
				let name: string;
				try {
					name = await nextAvailableSketchName();
				} catch {
					window.alert("GIC could not choose a unique sketch name.");
					return;
				}
				discardRecovery();
				replaceDocument(createNewSketchDocument(name));
			};
			if (documentState.isDirty) {
				pendingReplacement.current = open;
				setDiscardOpen(true);
				return;
			}
			void open().catch(() => {
				window.alert("GIC could not choose a unique sketch name.");
			});
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
						openDocument(
							sketchBaseName(openedDocument.name),
							openedDocument.source,
							descriptionFromSidecar(
								openedDocument.name,
								openedDocument.description,
							),
						),
						openedDocument.documentId,
						openedDocument.sketchId,
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
