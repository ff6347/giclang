// ABOUTME: Composes the React IDE shell around the persisted FlexLayout model.
// ABOUTME: Coordinates panel controls, preview status, and error-driven layout behavior.

import { useEffect, useRef, useState } from "react";
import { Menubar } from "@base-ui/react/menubar";
import { Menu } from "@base-ui/react/menu";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Button } from "@base-ui/react/button";
import { Dialog } from "@base-ui/react/dialog";
import { Field } from "@base-ui/react/field";
import {
	Actions,
	Layout,
	type ITabRenderValues,
	type Model,
	type TabNode,
} from "flexlayout-react";
import "flexlayout-react/style/combined.scss";
import {
	ABOUT_ID,
	CODE_ID,
	createDefaultWorkspace,
	DOCS_ID,
	EDITOR_ID,
	EXAMPLES_ID,
	loadWorkspace,
	OUTPUT_ID,
	PREVIEW_ID,
	PROBLEMS_ID,
	saveWorkspace,
	SETTINGS_ID,
} from "../lib/workspace-model.ts";
import { SettingsPanel } from "./settings-panel.tsx";
import { ExamplesPanel } from "./examples-panel.tsx";
import { AboutPanel } from "./about-panel.tsx";
import { DocsPanel } from "./docs-panel.tsx";
import { ProblemsPanel } from "./problems-panel.tsx";
import { OutputPanel } from "./output-panel.tsx";
import { PreviewPanel } from "./preview-panel.tsx";
import { EditorPanel } from "./editor-panel.tsx";
import { productContent } from "../lib/content.ts";
import { usePreview } from "../hooks/use-preview.ts";
import { useDocument } from "../hooks/use-document.ts";
import { useAppUpdate } from "../hooks/use-app-update.ts";
import { downloadStandaloneHtml } from "../lib/standalone-export.ts";
import { AppUpdate } from "./app-update.tsx";

const CANVAS_FRAME_STORAGE_KEY = "gic.canvasFrame";
const FORMAT_ON_SAVE_STORAGE_KEY = "gic.formatOnSave";

function initialCanvasFrame(): boolean {
	return localStorage.getItem(CANVAS_FRAME_STORAGE_KEY) !== "false";
}

function initialFormatOnSave(): boolean {
	return localStorage.getItem(FORMAT_ON_SAVE_STORAGE_KEY) !== "false";
}

function countLabel(name: string, count: number): string {
	return count === 0 ? name : `${name} (${count})`;
}

export function App() {
	const [canvasFrame, setCanvasFrame] = useState(initialCanvasFrame);
	const [formatOnSave, setFormatOnSave] = useState(initialFormatOnSave);
	const [model, setModel] = useState(loadWorkspace);
	const [, setLayoutRevision] = useState(0);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const openFile = useRef<HTMLInputElement>(null);
	const appUpdate = useAppUpdate();
	const preview = usePreview(canvasRef);
	const selectGestalten = () => {
		model.doAction(Actions.selectTab(CODE_ID));
		saveWorkspace(model);
		setLayoutRevision((revision) => revision + 1);
	};
	const documents = useDocument(formatOnSave, selectGestalten);

	useEffect(() => {
		model.doAction(Actions.renameTab(CODE_ID, "Gestalten"));
	}, [model]);

	useEffect(() => {
		const label = `${documents.documentState.displayName}${documents.documentState.isDirty ? " *" : ""}`;
		model.doAction(Actions.renameTab(EDITOR_ID, label));
	}, [documents.documentState, model]);

	const layoutChanged = (changedModel: Model) => {
		saveWorkspace(changedModel);
		setLayoutRevision((revision) => revision + 1);
	};

	const resetLayout = () => {
		const defaultModel = createDefaultWorkspace();
		saveWorkspace(defaultModel);
		setModel(defaultModel);
	};

	const updateCanvasFrame = (checked: boolean) => {
		setCanvasFrame(checked);
		localStorage.setItem(CANVAS_FRAME_STORAGE_KEY, String(checked));
	};

	const updateFormatOnSave = (checked: boolean) => {
		setFormatOnSave(checked);
		localStorage.setItem(FORMAT_ON_SAVE_STORAGE_KEY, String(checked));
	};

	const updateSource = (nextSource: string) => {
		documents.updateSource(nextSource);
		preview.onSourceChange(nextSource);
	};

	const renderTab = (node: TabNode, values: ITabRenderValues) => {
		if (node.getId() === PROBLEMS_ID) {
			const label = countLabel("Problems", preview.state.problems.length);
			values.content = label;
		}
		if (node.getId() === OUTPUT_ID) {
			const label = countLabel("Output", preview.state.output.length);
			values.content = label;
		}
	};

	const panelFactory = (node: TabNode) => {
		switch (node.getComponent()) {
			case EDITOR_ID:
				return (
					<EditorPanel
						onEditorReady={preview.setEditor}
						onSave={documents.requestSave}
						onSourceChange={updateSource}
						source={documents.documentState.source}
					/>
				);
			case PREVIEW_ID:
				return (
					<PreviewPanel
						canvasFrame={canvasFrame}
						canvasRef={canvasRef}
						isCurrentSourceRendered={preview.state.isCurrentSourceRendered}
						onDownloadStandalone={() =>
							void downloadStandaloneHtml(documents.documentState.source)
						}
					/>
				);
			case PROBLEMS_ID:
				return <ProblemsPanel entries={preview.state.problems} />;
			case OUTPUT_ID:
				return <OutputPanel entries={preview.state.output} />;
			case SETTINGS_ID:
				return (
					<SettingsPanel
						canvasFrame={canvasFrame}
						formatOnSave={formatOnSave}
						onCanvasFrameChange={updateCanvasFrame}
						onFormatOnSaveChange={updateFormatOnSave}
						onResetLayout={resetLayout}
					/>
				);
			case EXAMPLES_ID:
				return (
					<ExamplesPanel
						examples={productContent.examples}
						onOpen={documents.requestExample}
					/>
				);
			case DOCS_ID:
				return <DocsPanel docs={productContent.docs} />;
			case ABOUT_ID:
				return <AboutPanel content={productContent.about} />;
			default:
				throw new Error(`Unknown layout panel '${node.getComponent()}'.`);
		}
	};

	return (
		<main className="app-shell">
			<header className="application-chrome">
				<Menubar aria-label="Application menu" className="application-menubar">
					<Menu.Root>
						<Menu.Trigger className="application-menu-trigger">
							File
						</Menu.Trigger>
						<Menu.Portal>
							<Menu.Positioner className="application-menu-positioner">
								<Menu.Popup
									aria-label="File"
									className="application-menu-popup"
								>
									<Menu.Item
										className="application-menu-item"
										onClick={() => openFile.current?.click()}
									>
										Open
									</Menu.Item>
									<Menu.Item
										className="application-menu-item"
										disabled={!documents.documentState.canSave}
										onClick={documents.requestSave}
									>
										Save
									</Menu.Item>
									<Menu.Item
										className="application-menu-item"
										onClick={documents.openSaveAs}
									>
										Save As
									</Menu.Item>
								</Menu.Popup>
							</Menu.Positioner>
						</Menu.Portal>
					</Menu.Root>
				</Menubar>
				{appUpdate.isWaiting && (
					<AppUpdate
						isPostponed={appUpdate.isPostponed}
						onApply={appUpdate.applyUpdate}
						onPostpone={appUpdate.postponeUpdate}
					/>
				)}
				<input
					accept=".gic"
					hidden
					id="open-file"
					ref={openFile}
					type="file"
					onChange={(event) => {
						const file = event.currentTarget.files?.item(0);
						if (file !== null && file !== undefined) {
							documents.requestOpen(file);
						}
						event.currentTarget.value = "";
					}}
				/>
			</header>
			<div className="application-layout">
				<Layout
					factory={panelFactory}
					model={model}
					onModelChange={layoutChanged}
					onRenderTab={renderTab}
				/>
			</div>
			{documents.saveAsOpen && (
				<Dialog.Root open>
					<Dialog.Portal>
						<Dialog.Backdrop className="recovery-backdrop" />
						<Dialog.Viewport className="recovery-viewport">
							<Dialog.Popup className="recovery-popup">
								<Dialog.Title>Save sketch as</Dialog.Title>
								<form
									className="application-form"
									onSubmit={(event) => {
										event.preventDefault();
										const name = new FormData(event.currentTarget).get(
											"file-name",
										);
										if (typeof name === "string") documents.saveAs(name);
									}}
								>
									<Field.Root className="application-field">
										<Field.Label>File name</Field.Label>
										<Field.Control
											className="application-input"
											defaultValue="sketch.gic"
											name="file-name"
											required
										/>
									</Field.Root>
									<div className="application-actions">
										<Button className="application-button" type="submit">
											Save copy
										</Button>
										<Button
											className="application-button"
											type="button"
											onClick={documents.cancelSaveAs}
										>
											Cancel
										</Button>
									</div>
								</form>
							</Dialog.Popup>
						</Dialog.Viewport>
					</Dialog.Portal>
				</Dialog.Root>
			)}
			{documents.discardOpen && (
				<AlertDialog.Root open>
					<AlertDialog.Portal>
						<AlertDialog.Backdrop className="recovery-backdrop" />
						<AlertDialog.Viewport className="recovery-viewport">
							<AlertDialog.Popup className="recovery-popup">
								<AlertDialog.Title>Discard changes?</AlertDialog.Title>
								<AlertDialog.Description>
									Your unsaved changes will be discarded.
								</AlertDialog.Description>
								<div className="recovery-actions">
									<Button
										className="application-button"
										onClick={documents.confirmDiscard}
									>
										Discard changes
									</Button>
									<Button
										className="application-button"
										onClick={documents.cancelDiscard}
									>
										Keep editing
									</Button>
								</div>
							</AlertDialog.Popup>
						</AlertDialog.Viewport>
					</AlertDialog.Portal>
				</AlertDialog.Root>
			)}
			{documents.recoveryOpen && (
				<AlertDialog.Root open>
					<AlertDialog.Portal>
						<AlertDialog.Backdrop className="recovery-backdrop" />
						<AlertDialog.Viewport className="recovery-viewport">
							<AlertDialog.Popup className="recovery-popup">
								<AlertDialog.Title>Recover unsaved sketch?</AlertDialog.Title>
								<AlertDialog.Description>
									A copy of unsaved work is available from a previous session.
								</AlertDialog.Description>
								<div className="recovery-actions">
									<Button
										className="recovery-button"
										onClick={documents.restoreRecovery}
									>
										Restore
									</Button>
									<Button
										className="recovery-button"
										onClick={documents.dismissRecovery}
									>
										Discard recovery
									</Button>
								</div>
							</AlertDialog.Popup>
						</AlertDialog.Viewport>
					</AlertDialog.Portal>
				</AlertDialog.Root>
			)}
		</main>
	);
}
