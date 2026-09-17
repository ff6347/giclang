// ABOUTME: Composes the React IDE shell around the persisted FlexLayout model.
// ABOUTME: Coordinates panel controls, preview status, and error-driven layout behavior.

import { useRef, useState } from "react";
import {
	Layout,
	type ITabRenderValues,
	type Model,
	type TabNode,
} from "flexlayout-react";
import "flexlayout-react/style/light.scss";
import {
	ABOUT_ID,
	CODE_ID,
	createApplicationModel,
	DOCS_ID,
	EXAMPLES_ID,
	SETTINGS_ID,
} from "./application-model.ts";
import {
	AboutView,
	DocsView,
	ExamplesView,
	SettingsView,
} from "./application-pages.tsx";
import {
	createDefaultWorkspace,
	EDITOR_ID,
	loadWorkspace,
	OUTPUT_ID,
	PREVIEW_ID,
	PROBLEMS_ID,
	saveWorkspace,
	TUTOR_ID,
} from "./workspace-model.ts";
import {
	EditorPanel,
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
	const [applicationModel] = useState(createApplicationModel);
	const [formatOnSave, setFormatOnSave] = useState(initialFormatOnSave);
	const [model, setModel] = useState(loadWorkspace);
	const [source, setSource] = useState("");
	const [, setLayoutRevision] = useState(0);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const preview = usePreview(canvasRef);

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
		setSource(nextSource);
		preview.onSourceChange(nextSource);
	};

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

	const workspacePanelFactory = (node: TabNode) => {
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
				return <TutorPanel />;
			default:
				throw new Error(`Unknown workspace panel '${node.getComponent()}'.`);
		}
	};

	const applicationPanelFactory = (node: TabNode) => {
		switch (node.getComponent()) {
			case CODE_ID:
				return (
					<div className="workspace">
						<Layout
							factory={workspacePanelFactory}
							model={model}
							onModelChange={layoutChanged}
							onRenderTab={renderTab}
						/>
					</div>
				);
			case SETTINGS_ID:
				return (
					<SettingsView
						formatOnSave={formatOnSave}
						onFormatOnSaveChange={updateFormatOnSave}
						onResetLayout={resetLayout}
					/>
				);
			case EXAMPLES_ID:
				return <ExamplesView />;
			case DOCS_ID:
				return <DocsView />;
			case ABOUT_ID:
				return <AboutView />;
			default:
				throw new Error(`Unknown application tab '${node.getComponent()}'.`);
		}
	};

	return (
		<main className="app-shell">
			<div className="application-layout">
				<Layout factory={applicationPanelFactory} model={applicationModel} />
			</div>
		</main>
	);
}
