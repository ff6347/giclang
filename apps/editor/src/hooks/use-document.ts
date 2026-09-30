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
import { DocumentActivation } from "../lib/document-activation.ts";
import { desktopOperationMessage } from "../lib/desktop-operation-message.ts";
import type { DesktopHost } from "../lib/desktop-host.ts";
import {
	createExampleDocument,
	createNewSketchDocument,
	createRecoveredDocument,
	openDocument,
	completeDocumentSave,
	renameDocument,
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

function readHostRecovery(
	snapshot: ReturnType<BrowserDocumentAdapter["readRecovery"]>,
	desktop: DesktopHost | undefined,
) {
	if (snapshot === undefined || desktop !== undefined) return snapshot;
	if (snapshot.document.source === snapshot.document.baselineSource) {
		return undefined;
	}
	const description = defaultSketchDescription(
		sketchBaseName(snapshot.document.displayName),
	);
	return {
		...snapshot,
		document: {
			...snapshot.document,
			description,
			baselineDescription: description,
		},
	};
}

export function useDocument(
	formatOnSave: boolean,
	onExampleOpened: () => void,
	desktop: DesktopHost | undefined,
	captureThumbnail: (source: string) => string | undefined,
	adoptSavedSource: (sourceBefore: string, sourceAdopted: string) => void,
	onDocumentActivated: (source: string) => void,
	onSaved: () => void,
) {
	const adapter = useRef(new BrowserDocumentAdapter()).current;
	const desktopDocumentId = useRef<string | undefined>(undefined);
	const newSketchNames = useRef(new Set<string>()).current;
	const storedRecovery = useRef(adapter.readRecovery()).current;
	const initialRecovery = useRef(
		readHostRecovery(storedRecovery, desktop),
	).current;
	const knownRecoveryUpdatedAt = useRef(storedRecovery?.updatedAt ?? 0);
	const pendingReplacement = useRef<(() => Promise<void> | void) | undefined>(
		undefined,
	);
	const pendingCancellation = useRef<(() => void) | undefined>(undefined);
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
	const documentGeneration = useRef(0);
	const documentRevision = useRef(0);
	const activation = useRef(new DocumentActivation()).current;
	const [saveAsOpen, setSaveAsOpen] = useState(false);
	const [activationPending, setActivationPending] = useState(false);
	const [operationMessage, setOperationMessage] = useState<
		string | undefined
	>();
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
		documentStateRef.current = nextDocument;
		setDocumentState(nextDocument);
	};

	const replaceDocument = (
		nextDocument: DocumentState,
		documentId?: string,
		nextSketchId?: string,
		preservePreview = false,
	) => {
		documentGeneration.current += 1;
		documentStateRef.current = nextDocument;
		desktopDocumentId.current = documentId;
		setDocumentId(documentId);
		setSketchId(nextSketchId ?? nextDocument.displayName);
		replace(nextDocument);
		if (!preservePreview) onDocumentActivated(nextDocument.source);
	};

	const discardRecovery = () => {
		adapter.clearRecovery(knownRecoveryUpdatedAt.current);
		knownRecoveryUpdatedAt.current = 0;
	};

	const acquireActivation = () => {
		const lease = activation.acquire();
		if (lease !== undefined) setActivationPending(true);
		return lease;
	};

	const releaseActivation = (lease: symbol) => {
		if (activation.release(lease)) setActivationPending(false);
	};

	const rejectWhileActivating = () => {
		if (!activation.isPending) return false;
		setOperationMessage(
			"Wait for the sketch to finish opening before continuing.",
		);
		return true;
	};

	const sourceForSave = (document = documentStateRef.current) =>
		applySaveFormatting(document.source, { formatOnSave });
	const descriptionForSave = (
		document = documentStateRef.current,
	): string | null =>
		document.description.body.trim() === ""
			? null
			: serializeSketchDescription(document.description);
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
		const snapshot = documentStateRef.current;
		const source = sourceForSave(snapshot);
		const savedName = normalizeFileName(name);
		adapter.download(savedName, source);
		adapter.recordRecent(savedName);
		const savedDocument = openDocument(savedName, source);
		replaceDocument(savedDocument, undefined, savedName, true);
		if (savedDocument.source === source) {
			adoptSavedSource(snapshot.source, savedDocument.source);
		}
		if (savedDocument.isDirty) persistRecovery(savedDocument);
		else discardRecovery();
		setSaveAsOpen(false);
	};

	const saveDesktopDocumentAs = async () => {
		if (desktop === undefined) return;
		const snapshot = documentStateRef.current;
		const generation = documentGeneration.current;
		const source = sourceForSave(snapshot);
		const thumbnail = captureThumbnail(snapshot.source);
		let suggestedName = snapshot.displayName.endsWith(".gic")
			? snapshot.displayName.slice(0, -".gic".length)
			: snapshot.displayName;
		if (snapshot.kind === "untitled") {
			const existingNames = await desktop.existingSketchNames();
			if (generation !== documentGeneration.current) return;
			if (existingNames.includes(suggestedName)) {
				const takenNames = new Set(existingNames);
				for (const name of newSketchNames) {
					if (name !== suggestedName) takenNames.add(name);
				}
				suggestedName = nextSketchName(takenNames, new Date());
				const current = documentStateRef.current;
				if (
					current.kind === "untitled" &&
					current.displayName === snapshot.displayName
				) {
					newSketchNames.delete(snapshot.displayName);
					newSketchNames.add(suggestedName);
					replace(renameDocument(current, suggestedName));
				}
			}
		}
		const saved = await desktop.saveDocumentAs(
			source,
			suggestedName,
			descriptionForSave(snapshot),
			thumbnail,
		);
		if (saved === null) return;
		onSaved();
		if (generation !== documentGeneration.current) {
			await desktop.cancelOpenDocument(saved.documentId);
			return;
		}
		const lease = acquireActivation();
		if (lease === undefined) {
			await desktop.cancelOpenDocument(saved.documentId);
			setOperationMessage(
				"The saved sketch was not activated because another sketch is opening.",
			);
			return;
		}
		try {
			await desktop.acceptOpenDocument(saved.documentId);
			if (generation !== documentGeneration.current) return;
			const savedDocument = openDocument(
				sketchBaseName(saved.name),
				saved.source,
				descriptionFromSidecar(saved.name, saved.description),
			);
			const advanced = completeDocumentSave(
				documentStateRef.current,
				savedDocument,
				snapshot,
				String(documentGeneration.current),
				String(generation),
			);
			if (advanced === undefined) return;
			replaceDocument(advanced, saved.documentId, saved.sketchId, true);
			if (advanced.source === savedDocument.source) {
				adoptSavedSource(snapshot.source, advanced.source);
			}
			if (advanced.isDirty) persistRecovery(advanced);
			else discardRecovery();
		} finally {
			releaseActivation(lease);
		}
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
				if (activation.isPending) return;
				newSketchNames.delete(initialSketchName);
				newSketchNames.add(name);
				replace(renameDocument(current, name));
			})
			.catch(() => {});
		return () => {
			disposed = true;
		};
	}, [desktop, initialSketchName, newSketchNames]);

	const saveDesktopDocument = async () => {
		if (desktop === undefined) return;
		const snapshot = documentStateRef.current;
		const generation = documentGeneration.current;
		const documentId = desktopDocumentId.current;
		if (!snapshot.canSave || documentId === undefined) {
			await saveDesktopDocumentAs();
			return;
		}
		const source = sourceForSave(snapshot);
		const thumbnail = captureThumbnail(snapshot.source);
		await desktop.saveDocument(
			documentId,
			source,
			descriptionForSave(snapshot),
			thumbnail,
		);
		onSaved();
		if (generation !== documentGeneration.current) return;
		const current = documentStateRef.current;
		const savedDocument = openDocument(
			snapshot.displayName,
			source,
			snapshot.description.body.trim() === ""
				? defaultSketchDescription(sketchBaseName(snapshot.displayName))
				: snapshot.description,
		);
		const advanced = completeDocumentSave(
			current,
			savedDocument,
			snapshot,
			String(documentGeneration.current),
			String(generation),
		);
		if (advanced === undefined) return;
		replace(advanced);
		if (advanced.source === source) {
			adoptSavedSource(snapshot.source, advanced.source);
		}
		if (advanced.isDirty) persistRecovery(advanced);
		else discardRecovery();
	};

	const runDesktopOperation = (operation: () => Promise<void>) => {
		setOperationMessage(undefined);
		void operation().catch((error: unknown) => {
			setOperationMessage(desktopOperationMessage(error));
		});
	};

	return {
		documentState,
		documentId,
		sketchId,
		activationPending,
		operationMessage,
		discardOpen,
		recoveryOpen,
		recentFiles: adapter.listRecent(),
		saveAsOpen,
		updateSource(source: string) {
			if (rejectWhileActivating()) return;
			const nextDocument = updateDocumentSource(documentState, source);
			if (nextDocument !== documentState) documentRevision.current += 1;
			replace(nextDocument);
			persistRecovery(nextDocument);
		},
		updateDescription(description: SketchDescription) {
			if (rejectWhileActivating()) return;
			const nextDocument = updateDocumentDescription(
				documentState,
				description,
			);
			if (nextDocument !== documentState) documentRevision.current += 1;
			replace(nextDocument);
			persistRecovery(nextDocument);
		},
		requestNew() {
			if (rejectWhileActivating()) return;
			const generation = documentGeneration.current;
			const open = async (discardConfirmed = false) => {
				const revision = documentRevision.current;
				let name: string;
				try {
					name = await nextAvailableSketchName();
				} catch {
					window.alert("GIC could not choose a unique sketch name.");
					return;
				}
				if (generation !== documentGeneration.current) return;
				if (rejectWhileActivating()) return;
				if (
					documentRevision.current !== revision &&
					documentStateRef.current.isDirty
				) {
					pendingReplacement.current = () => open(true);
					setDiscardOpen(true);
					return;
				}
				if (documentStateRef.current.isDirty && !discardConfirmed) {
					pendingReplacement.current = () => open(true);
					setDiscardOpen(true);
					return;
				}
				discardRecovery();
				replaceDocument(createNewSketchDocument(name));
			};
			if (documentStateRef.current.isDirty) {
				pendingReplacement.current = () => open(true);
				setDiscardOpen(true);
				return;
			}
			void open().catch(() => {
				window.alert("GIC could not choose a unique sketch name.");
			});
		},
		requestSave() {
			if (rejectWhileActivating()) return;
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
			if (rejectWhileActivating()) return;
			if (desktop !== undefined) {
				runDesktopOperation(saveDesktopDocumentAs);
				return;
			}
			setSaveAsOpen(true);
		},
		saveAs(name: string) {
			if (rejectWhileActivating()) return;
			saveBrowserDocument(name);
		},
		cancelSaveAs() {
			if (rejectWhileActivating()) return;
			setSaveAsOpen(false);
		},
		requestOpen(file: File) {
			if (rejectWhileActivating()) return;
			const generation = documentGeneration.current;
			const open = async (discardConfirmed = false) => {
				const revision = documentRevision.current;
				const openedFile = await adapter.readFile(file);
				if (generation !== documentGeneration.current) return;
				if (rejectWhileActivating()) return;
				if (
					documentRevision.current !== revision &&
					documentStateRef.current.isDirty
				) {
					pendingReplacement.current = () => open(true);
					setDiscardOpen(true);
					return;
				}
				if (documentStateRef.current.isDirty && !discardConfirmed) {
					pendingReplacement.current = () => open(true);
					setDiscardOpen(true);
					return;
				}
				discardRecovery();
				adapter.recordRecent(openedFile.name);
				replaceDocument(openDocument(openedFile.name, openedFile.source));
			};
			if (documentStateRef.current.isDirty) {
				pendingReplacement.current = () => open(true);
				setDiscardOpen(true);
				return;
			}
			void open();
		},
		requestDesktopOpen(entryId?: string) {
			if (rejectWhileActivating()) return;
			if (desktop === undefined) return;
			const generation = documentGeneration.current;
			const chooseDocument = async () => {
				const openedDocument =
					entryId === undefined
						? await desktop.openDocument()
						: await desktop.openGallerySketch(entryId);
				if (openedDocument === null) return;
				if (generation !== documentGeneration.current) {
					await desktop.cancelOpenDocument(openedDocument.documentId);
					return;
				}
				if (rejectWhileActivating()) {
					await desktop.cancelOpenDocument(openedDocument.documentId);
					return;
				}
				let nextDocument: DocumentState;
				try {
					nextDocument = openDocument(
						sketchBaseName(openedDocument.name),
						openedDocument.source,
						descriptionFromSidecar(
							openedDocument.name,
							openedDocument.description,
						),
					);
				} catch (error) {
					await desktop.cancelOpenDocument(openedDocument.documentId);
					throw error;
				}
				const open = async () => {
					if (generation !== documentGeneration.current) {
						await desktop.cancelOpenDocument(openedDocument.documentId);
						return;
					}
					const lease = acquireActivation();
					if (lease === undefined) {
						await desktop.cancelOpenDocument(openedDocument.documentId);
						setOperationMessage(
							"The selected sketch was not opened because another sketch is opening.",
						);
						return;
					}
					try {
						await desktop.acceptOpenDocument(openedDocument.documentId);
						if (generation !== documentGeneration.current) return;
						discardRecovery();
						replaceDocument(
							nextDocument,
							openedDocument.documentId,
							openedDocument.sketchId,
						);
					} finally {
						releaseActivation(lease);
					}
				};
				if (documentStateRef.current.isDirty) {
					pendingReplacement.current = open;
					pendingCancellation.current = () => {
						void desktop.cancelOpenDocument(openedDocument.documentId);
					};
					setDiscardOpen(true);
					return;
				}
				await open();
			};
			runDesktopOperation(chooseDocument);
		},
		requestExample(id: string) {
			if (rejectWhileActivating()) return;
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
			if (rejectWhileActivating()) return;
			setDiscardOpen(false);
			pendingCancellation.current = undefined;
			const replacement = pendingReplacement.current;
			pendingReplacement.current = undefined;
			if (replacement !== undefined) {
				void Promise.resolve(replacement()).catch((error: unknown) => {
					setOperationMessage(desktopOperationMessage(error));
				});
			}
		},
		cancelDiscard() {
			if (rejectWhileActivating()) return;
			pendingReplacement.current = undefined;
			pendingCancellation.current?.();
			pendingCancellation.current = undefined;
			setDiscardOpen(false);
		},
		restoreRecovery() {
			if (rejectWhileActivating()) return;
			if (initialRecovery !== undefined) {
				replaceDocument(createRecoveredDocument(initialRecovery.document));
			}
			setRecoveryOpen(false);
		},
		dismissRecovery() {
			if (rejectWhileActivating()) return;
			discardRecovery();
			setRecoveryOpen(false);
		},
	};
}
