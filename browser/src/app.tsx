// ABOUTME: Composes the React IDE shell around the persisted FlexLayout model.
// ABOUTME: Coordinates panel controls, preview status, and error-driven layout behavior.

import {
	useEffect,
	useRef,
	useState,
	type KeyboardEvent,
	type MouseEvent,
} from "react";
import {
	Actions,
	Layout,
	type Action,
	type ITabRenderValues,
	type Model,
	type TabNode,
} from "flexlayout-react";
import "flexlayout-react/style/light.scss";
import { ApplicationTabs, type ApplicationTabId } from "./application-tabs.tsx";
import {
	AboutView,
	DocsView,
	ExamplesView,
	SettingsView,
} from "./application-pages.tsx";
import {
	createDefaultWorkspace,
	collapseSelectedCentralTab,
	EDITOR_ID,
	isBorderVisible,
	loadWorkspace,
	OUTPUT_ID,
	PREVIEW_ID,
	PROBLEMS_ID,
	saveWorkspace,
	showProblemsWhenLowerPanelIsHidden,
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

function tabIdForEventTarget(target: EventTarget | null): string | undefined {
	if (!(target instanceof Element)) return undefined;
	return target
		.closest("[role='tab']")
		?.id.replace("flexlayout-tabbutton-", "");
}

export function App() {
	const [activeApplicationTab, setActiveApplicationTab] =
		useState<ApplicationTabId>("code");
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

	const handleLayoutAction = (action: Action) => {
		const tabId = action.data.tabNode;
		if (
			action.type === Actions.SELECT_TAB &&
			typeof tabId === "string" &&
			collapseSelectedCentralTab(model, tabId)
		) {
			return undefined;
		}
		return action;
	};

	const handleCentralTabClick = (event: MouseEvent<HTMLDivElement>) => {
		const tabId = tabIdForEventTarget(event.target);
		if (tabId !== undefined && collapseSelectedCentralTab(model, tabId)) {
			event.stopPropagation();
		}
	};

	const handleCentralTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== "Enter" && event.key !== " ") return;
		const tabId = tabIdForEventTarget(event.target);
		if (tabId !== undefined && collapseSelectedCentralTab(model, tabId)) {
			event.preventDefault();
			event.stopPropagation();
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
				return <TutorPanel />;
			default:
				throw new Error(`Unknown workspace panel '${node.getComponent()}'.`);
		}
	};

	return (
		<main className="app-shell">
			<ApplicationTabs
				activeTab={activeApplicationTab}
				onSelect={setActiveApplicationTab}
				panels={{
					code: (
						<div
							className="workspace"
							onClickCapture={handleCentralTabClick}
							onKeyDownCapture={handleCentralTabKeyDown}
						>
							<Layout
								factory={panelFactory}
								model={model}
								onAction={handleLayoutAction}
								onModelChange={layoutChanged}
								onRenderTab={renderTab}
							/>
						</div>
					),
					settings: (
						<SettingsView
							formatOnSave={formatOnSave}
							onFormatOnSaveChange={updateFormatOnSave}
							onResetLayout={resetLayout}
						/>
					),
					examples: <ExamplesView />,
					docs: <DocsView />,
					about: <AboutView />,
				}}
			/>
		</main>
	);
}
