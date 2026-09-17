// ABOUTME: Composes the React IDE shell around the persisted FlexLayout model.
// ABOUTME: Coordinates panel controls, preview status, and error-driven layout behavior.

import { useEffect, useRef, useState } from "react";
import {
	Layout,
	type ITabRenderValues,
	type Model,
	type TabNode,
} from "flexlayout-react";
import "flexlayout-react/style/light.scss";
import {
	createDefaultWorkspace,
	EDITOR_ID,
	isBorderVisible,
	isPreviewVisible,
	loadWorkspace,
	OUTPUT_ID,
	PREVIEW_ID,
	PROBLEMS_ID,
	saveWorkspace,
	showProblemsWhenLowerPanelIsHidden,
	TUTOR_ID,
	toggleBorder,
	togglePreview,
} from "./workspace-model.ts";
import {
	EditorPanel,
	FormatOnSaveControl,
	OutputPanel,
	PreviewPanel,
	ProblemsPanel,
	TutorPanel,
} from "./workspace-panels.tsx";
import { usePreview } from "./use-preview.ts";

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
	const [source, setSource] = useState("");
	const [, setLayoutRevision] = useState(0);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const preview = usePreview(canvasRef);

	const editorVisible = isBorderVisible(model, EDITOR_ID);
	const previewVisible = isPreviewVisible(model);
	const tutorVisible = isBorderVisible(model, TUTOR_ID);
	const lowerPanelVisible = isBorderVisible(model, PROBLEMS_ID);

	const layoutChanged = (changedModel: Model) => {
		saveWorkspace(changedModel);
		setLayoutRevision((revision) => revision + 1);
	};

	const applyLayoutChange = (change: () => void) => {
		change();
		layoutChanged(model);
	};

	const toggleEditor = () => {
		applyLayoutChange(() => toggleBorder(model, EDITOR_ID));
	};
	const toggleMiddle = () => {
		applyLayoutChange(() => togglePreview(model));
	};
	const toggleTutor = () => {
		applyLayoutChange(() => toggleBorder(model, TUTOR_ID));
	};
	const toggleLowerPanel = () => {
		applyLayoutChange(() => toggleBorder(model, PROBLEMS_ID));
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
		setSource(nextSource);
		preview.onSourceChange(nextSource);
	};

	useEffect(() => {
		if (preview.state.problems.length === 0) return;
		if (isBorderVisible(model, PROBLEMS_ID)) return;
		showProblemsWhenLowerPanelIsHidden(model);
		layoutChanged(model);
	}, [model, preview.state.problems.length]);

	const renderTab = (node: TabNode, values: ITabRenderValues) => {
		if (node.getId() === PROBLEMS_ID) {
			const label = countLabel("Problems", preview.state.problems.length);
			values.content = label;
			values.name = label;
		}
		if (node.getId() === OUTPUT_ID) {
			const label = countLabel("Output", preview.state.output.length);
			values.content = label;
			values.name = label;
		}
	};

	const panelFactory = (node: TabNode) => {
		switch (node.getComponent()) {
			case EDITOR_ID:
				return (
					<EditorPanel
						formatOnSave={formatOnSave}
						initialSource={source}
						onEditorReady={preview.setEditor}
						onSourceChange={updateSource}
					/>
				);
			case PREVIEW_ID:
				return <PreviewPanel canvasRef={canvasRef} />;
			case PROBLEMS_ID:
				return <ProblemsPanel entries={preview.state.problems} />;
			case OUTPUT_ID:
				return <OutputPanel entries={preview.state.output} />;
			case TUTOR_ID:
				return <TutorPanel onHide={toggleTutor} />;
			default:
				throw new Error(`Unknown workspace panel '${node.getComponent()}'.`);
		}
	};

	return (
		<main className="app-shell">
			<header className="app-toolbar">
				<h1>GiC</h1>
				<FormatOnSaveControl
					checked={formatOnSave}
					onChange={updateFormatOnSave}
				/>
				<nav aria-label="Workspace controls">
					<button type="button" onClick={toggleEditor}>
						{editorVisible ? "Hide editor" : "Show editor"}
					</button>
					<button type="button" onClick={toggleMiddle}>
						{previewVisible ? "Hide preview" : "Show preview"}
					</button>
					<button type="button" onClick={toggleTutor}>
						{tutorVisible ? "Hide tutor" : "Show tutor"}
					</button>
					<button type="button" onClick={toggleLowerPanel}>
						{lowerPanelVisible ? "Hide lower panel" : "Show lower panel"}
					</button>
					<button type="button" onClick={resetLayout}>
						Reset Layout
					</button>
				</nav>
			</header>
			<div className="workspace">
				<Layout
					factory={panelFactory}
					model={model}
					onModelChange={layoutChanged}
					onRenderTab={renderTab}
				/>
			</div>
		</main>
	);
}
