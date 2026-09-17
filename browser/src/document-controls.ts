// ABOUTME: Connects visible document controls to the portable browser document adapter.
// ABOUTME: Coordinates one active sketch, discard protection, examples, and recovery.

import { applySaveFormatting } from "../../src/language-service.ts";
import connectedNodesExample from "../../examples/connected-nodes.gic?raw";
import repeatExample from "../../examples/repeat.gic?raw";
import reusableMotifExample from "../../examples/reusable-motif.gic?raw";
import type { DocumentAdapter } from "./browser-document-adapter.ts";
import {
	createExampleDocument,
	createRecoveredDocument,
	createUntitledDocument,
	openDocument,
	updateDocumentSource,
	type DocumentState,
} from "./document-model.ts";

const examples = {
	"connected-nodes.gic": connectedNodesExample,
	"repeat.gic": repeatExample,
	"reusable-motif.gic": reusableMotifExample,
};

interface DocumentControlsOptions {
	readonly adapter: DocumentAdapter;
	readonly formatOnSave: () => boolean;
	readonly getSource: () => string;
	readonly setSource: (source: string) => void;
}

function findElement<T extends Element>(selector: string): T {
	const element = document.querySelector<T>(selector);
	if (element === null) {
		throw new Error(`${selector} not found`);
	}
	return element;
}

function documentLabel(documentState: DocumentState): string {
	if (documentState.kind === "example") {
		return `${documentState.displayName} — example${documentState.isDirty ? " *" : ""}`;
	}
	return `${documentState.displayName}${documentState.isDirty ? " *" : ""}`;
}

function normalizeFileName(name: string): string {
	const trimmedName = name.trim();
	return trimmedName.endsWith(".gic") ? trimmedName : `${trimmedName}.gic`;
}

export function createDocumentControls({
	adapter,
	formatOnSave,
	getSource,
	setSource,
}: DocumentControlsOptions) {
	const openButton = findElement<HTMLButtonElement>("#open");
	const saveButton = findElement<HTMLButtonElement>("#save");
	const saveAsButton = findElement<HTMLButtonElement>("#save-as");
	const openFile = findElement<HTMLInputElement>("#open-file");
	const example = findElement<HTMLSelectElement>("#example");
	const documentStatus = findElement<HTMLParagraphElement>("#document-status");
	const recentFiles = findElement<HTMLUListElement>("#recent-files");
	const saveAsDialog = findElement<HTMLDialogElement>("#save-as-dialog");
	const saveAsForm = findElement<HTMLFormElement>("#save-as-form");
	const fileName = findElement<HTMLInputElement>("#file-name");
	const cancelSaveAs = findElement<HTMLButtonElement>("#cancel-save-as");
	const discardDialog = findElement<HTMLDialogElement>("#discard-dialog");
	const confirmDiscard = findElement<HTMLButtonElement>("#confirm-discard");
	const cancelDiscard = findElement<HTMLButtonElement>("#cancel-discard");
	const recoveryDialog = findElement<HTMLDialogElement>("#recovery-dialog");
	const restoreRecovery = findElement<HTMLButtonElement>("#restore-recovery");
	const dismissRecovery = findElement<HTMLButtonElement>("#dismiss-recovery");

	let activeDocument = createUntitledDocument();
	let knownRecoveryUpdatedAt = 0;
	let onReplacementCancelled: (() => void) | undefined;
	let pendingReplacement: (() => void | Promise<void>) | undefined;

	const renderRecentFiles = () => {
		recentFiles.replaceChildren(
			...adapter.listRecent().map((name) => {
				const item = document.createElement("li");
				const button = document.createElement("button");
				button.type = "button";
				button.textContent = name;
				button.addEventListener("click", () => openFile.click());
				item.append(button);
				return item;
			}),
		);
	};

	const renderDocument = () => {
		const label = documentLabel(activeDocument);
		documentStatus.textContent = label;
		document.title = `${label} | GiC`;
		saveButton.disabled = !activeDocument.canSave;
		renderRecentFiles();
	};

	const persistRecovery = () => {
		if (!activeDocument.isDirty) {
			return;
		}
		const updatedAt = Date.now();
		if (
			adapter.writeRecovery(activeDocument, updatedAt, knownRecoveryUpdatedAt)
		) {
			knownRecoveryUpdatedAt = updatedAt;
		}
	};

	const setActiveDocument = (nextDocument: DocumentState) => {
		activeDocument = nextDocument;
		renderDocument();
		setSource(nextDocument.source);
	};

	const discardRecovery = () => {
		adapter.clearRecovery(knownRecoveryUpdatedAt);
		knownRecoveryUpdatedAt = 0;
	};

	const formatForSave = () => {
		const source = getSource();
		const formattedSource = applySaveFormatting(source, {
			formatOnSave: formatOnSave(),
		});
		if (formattedSource !== source) {
			setSource(formattedSource);
		}
	};

	const save = (name: string) => {
		const savedSource = getSource();
		const savedName = normalizeFileName(name);
		adapter.download(savedName, savedSource);
		activeDocument = openDocument(savedName, savedSource);
		adapter.recordRecent(savedName);
		discardRecovery();
		renderDocument();
	};

	const openSaveAsDialog = () => {
		fileName.value =
			activeDocument.canSave && activeDocument.displayName.endsWith(".gic")
				? activeDocument.displayName
				: "sketch.gic";
		saveAsDialog.showModal();
		fileName.focus();
		fileName.select();
	};

	const requestReplacement = (
		replacement: () => void | Promise<void>,
		onCancelled: () => void = () => {},
	) => {
		if (!activeDocument.isDirty) {
			void replacement();
			return;
		}
		pendingReplacement = replacement;
		onReplacementCancelled = onCancelled;
		discardDialog.showModal();
	};

	openButton.addEventListener("click", () => openFile.click());
	openFile.addEventListener("change", () => {
		const file = openFile.files?.item(0);
		openFile.value = "";
		if (file === null || file === undefined) {
			return;
		}
		requestReplacement(async () => {
			const openedFile = await adapter.readFile(file);
			discardRecovery();
			setActiveDocument(openDocument(openedFile.name, openedFile.source));
			adapter.recordRecent(openedFile.name);
			renderRecentFiles();
		});
	});

	saveButton.addEventListener("click", () => {
		formatForSave();
		save(activeDocument.displayName);
	});
	saveAsButton.addEventListener("click", openSaveAsDialog);
	saveAsForm.addEventListener("submit", (event) => {
		event.preventDefault();
		formatForSave();
		save(fileName.value);
		saveAsDialog.close();
	});
	cancelSaveAs.addEventListener("click", () => saveAsDialog.close());

	example.addEventListener("change", () => {
		const selectedExample = example.value as keyof typeof examples | "";
		if (selectedExample === "") {
			return;
		}
		requestReplacement(
			() => {
				discardRecovery();
				setActiveDocument(
					createExampleDocument(selectedExample, examples[selectedExample]),
				);
			},
			() => {
				example.value = "";
			},
		);
		example.value = "";
	});

	confirmDiscard.addEventListener("click", () => {
		discardDialog.close();
		discardRecovery();
		const replacement = pendingReplacement;
		pendingReplacement = undefined;
		onReplacementCancelled = undefined;
		if (replacement !== undefined) {
			void replacement();
		}
	});
	cancelDiscard.addEventListener("click", () => {
		discardDialog.close();
		pendingReplacement = undefined;
		const onCancelled = onReplacementCancelled;
		onReplacementCancelled = undefined;
		onCancelled?.();
	});

	const snapshot = adapter.readRecovery();
	if (snapshot !== undefined) {
		knownRecoveryUpdatedAt = snapshot.updatedAt;
		recoveryDialog.showModal();
		restoreRecovery.addEventListener("click", () => {
			recoveryDialog.close();
			setActiveDocument(createRecoveredDocument(snapshot.document));
		});
		dismissRecovery.addEventListener("click", () => {
			recoveryDialog.close();
			discardRecovery();
		});
	}

	renderDocument();

	return {
		onSourceChange(source: string) {
			activeDocument = updateDocumentSource(activeDocument, source);
			renderDocument();
			persistRecovery();
		},
		save() {
			if (activeDocument.canSave) {
				formatForSave();
				save(activeDocument.displayName);
				return;
			}
			openSaveAsDialog();
		},
	};
}
