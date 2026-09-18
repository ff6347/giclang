// ABOUTME: Composes the React IDE shell around the persisted FlexLayout model.
// ABOUTME: Coordinates panel controls, preview status, and error-driven layout behavior.

import { useEffect, useRef, useState } from "react";
import { Menubar } from "@base-ui/react/menubar";
import { Menu } from "@base-ui/react/menu";
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
	TUTOR_ID,
} from "./workspace-model.ts";
import {
	AboutView,
	DocsView,
	ExamplesView,
	SettingsView,
} from "./application-pages.tsx";
import {
	EditorPanel,
	OutputPanel,
	PreviewPanel,
	ProblemsPanel,
	TutorPanel,
} from "./workspace-panels.tsx";
import { usePreview } from "./use-preview.ts";
import { examples, useDocument } from "./use-document.ts";

const FORMAT_ON_SAVE_STORAGE_KEY = "gic.formatOnSave";

function initialFormatOnSave(): boolean {
	return localStorage.getItem(FORMAT_ON_SAVE_STORAGE_KEY) !== "false";
}

function countLabel(name: string, count: number): string {
	return count === 0 ? name : `${name} (${count})`;
}

export function App() {
	const [formatOnSave, setFormatOnSave] = useState(initialFormatOnSave);
	const [model, setModel] = useState(loadWorkspace);
	const [, setLayoutRevision] = useState(0);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const openFile = useRef<HTMLInputElement>(null);
	const preview = usePreview(canvasRef);
	const documents = useDocument(formatOnSave);

	useEffect(() => {
		model.doAction(Actions.renameTab(CODE_ID, "Gestalten"));
		model.doAction(Actions.renameTab(TUTOR_ID, "Agent"));
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
				return <PreviewPanel canvasRef={canvasRef} />;
			case PROBLEMS_ID:
				return <ProblemsPanel entries={preview.state.problems} />;
			case OUTPUT_ID:
				return <OutputPanel entries={preview.state.output} />;
			case TUTOR_ID:
				return <TutorPanel />;
			case SETTINGS_ID:
				return (
					<SettingsView
						formatOnSave={formatOnSave}
						onFormatOnSaveChange={updateFormatOnSave}
						onResetLayout={resetLayout}
					/>
				);
			case EXAMPLES_ID:
				return (
					<ExamplesView
						examples={Object.keys(examples)}
						onOpen={(name) =>
							documents.requestExample(name as keyof typeof examples)
						}
					/>
				);
			case DOCS_ID:
				return <DocsView />;
			case ABOUT_ID:
				return <AboutView />;
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
				<dialog open aria-label="Save sketch as">
					<form
						onSubmit={(event) => {
							event.preventDefault();
							const name = new FormData(event.currentTarget).get("file-name");
							if (typeof name === "string") documents.saveAs(name);
						}}
					>
						<label>
							File name
							<input defaultValue="sketch.gic" name="file-name" required />
						</label>
						<button type="submit">Save copy</button>
						<button type="button" onClick={documents.cancelSaveAs}>
							Cancel
						</button>
					</form>
				</dialog>
			)}
			{documents.discardOpen && (
				<dialog open aria-label="Discard changes?">
					<p>Your unsaved changes will be discarded.</p>
					<button type="button" onClick={documents.confirmDiscard}>
						Discard changes
					</button>
					<button type="button" onClick={documents.cancelDiscard}>
						Keep editing
					</button>
				</dialog>
			)}
			{documents.recoveryOpen && (
				<dialog open aria-label="Recover unsaved sketch?">
					<p>A copy of unsaved work is available from a previous session.</p>
					<button type="button" onClick={documents.restoreRecovery}>
						Restore
					</button>
					<button type="button" onClick={documents.dismissRecovery}>
						Discard recovery
					</button>
				</dialog>
			)}
		</main>
	);
}
