// ABOUTME: Composes the React IDE shell around the persisted FlexLayout model.
// ABOUTME: Coordinates panel controls, preview status, and error-driven layout behavior.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Menubar } from "@base-ui/react/menubar";
import { Menu } from "@base-ui/react/menu";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Button } from "@base-ui/react/button";
import { Dialog } from "@base-ui/react/dialog";
import { Field } from "@base-ui/react/field";
import {
	Actions,
	Layout,
	TabNode,
	type ITabRenderValues,
	type Model,
} from "flexlayout-react";
import "flexlayout-react/style/combined.scss";
import {
	ABOUT_ID,
	CODE_ID,
	createDefaultWorkspace,
	DOC_COMPONENT,
	DOCS_ID,
	documentTabId,
	EDITOR_ID,
	EXAMPLES_ID,
	loadWorkspace,
	OUTPUT_ID,
	PREVIEW_ID,
	PROBLEMS_ID,
	AGENT_ID,
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
import { AgentPanel } from "./agent-panel.tsx";
import { productContent } from "../lib/content.ts";
import { usePreview } from "../hooks/use-preview.ts";
import { useDocument } from "../hooks/use-document.ts";
import { useAppUpdate } from "../hooks/use-app-update.ts";
import {
	createStandaloneHtml,
	downloadStandaloneHtml,
} from "../lib/standalone-export.ts";
import { AppUpdate } from "./app-update.tsx";
import type { ApplicationSettings } from "../lib/application-settings.ts";
import type {
	DesktopHost,
	DesktopMenuAction,
	OpencodeModel,
	ProviderCredentialStatus,
} from "../lib/desktop-host.ts";
import type { GicEditor } from "../lib/gic-editor.ts";
import {
	parseAppearance,
	parseDarkTheme,
	parseLightTheme,
	resolveWindowTheme,
} from "../lib/theme.ts";
import { useTheme } from "../hooks/use-theme.ts";
import { useWorkspace } from "../hooks/use-workspace.ts";
import { useAgent } from "../hooks/use-agent.ts";
import { buildAgentContext } from "../lib/agent.ts";
import { modelDiscoveryError } from "../lib/model-discovery.ts";
import {
	deriveVisibleModels,
	loadEnabledModelIds,
	loadSelectedModelId,
	saveEnabledModelIds,
	saveSelectedModelId,
	selectedVisibleModelId,
} from "../lib/model-preferences.ts";

const AGENT_RESPONSE_COPYING_STORAGE_KEY = "gic.agentResponseCopying";
const APPEARANCE_STORAGE_KEY = "gic.appearance";
const CANVAS_FRAME_STORAGE_KEY = "gic.canvasFrame";
const DARK_THEME_STORAGE_KEY = "gic.darkTheme";
const FORMAT_ON_SAVE_STORAGE_KEY = "gic.formatOnSave";
const LIGHT_THEME_STORAGE_KEY = "gic.lightTheme";
const docsByTabId = new Map(
	productContent.docs.map((doc) => [documentTabId(doc.id), doc]),
);
const docIds = new Set(productContent.docs.map((doc) => doc.id));

function initialAgentResponseCopying(settings: ApplicationSettings): boolean {
	return settings.getItem(AGENT_RESPONSE_COPYING_STORAGE_KEY) === "true";
}

function initialCanvasFrame(settings: ApplicationSettings): boolean {
	return settings.getItem(CANVAS_FRAME_STORAGE_KEY) !== "false";
}

function initialFormatOnSave(settings: ApplicationSettings): boolean {
	return settings.getItem(FORMAT_ON_SAVE_STORAGE_KEY) !== "false";
}

function countLabel(name: string, count: number): string {
	return count === 0 ? name : `${name} (${count})`;
}

function renderDragBadge(content: ReactNode): ReactNode {
	// Tauri's WebKit webview needs an explicit drag component instead of a
	// snapshot of the existing tab element.
	return content;
}

interface AppProps {
	readonly desktop: DesktopHost | undefined;
	readonly settings?: ApplicationSettings;
	readonly supportsAppUpdates?: boolean;
}

export function App({
	desktop,
	settings = localStorage,
	supportsAppUpdates = true,
}: AppProps) {
	const [providerStatus, setProviderStatus] =
		useState<ProviderCredentialStatus | null>(null);
	const [opencodeModels, setOpencodeModels] = useState<
		readonly OpencodeModel[]
	>([]);
	const [enabledModelIds, setEnabledModelIds] = useState(() =>
		loadEnabledModelIds(settings),
	);
	const [opencodeModel, setOpencodeModel] = useState("");
	const [opencodeModelError, setOpencodeModelError] = useState<string | null>(
		null,
	);
	const opencodeModelsRequest = useRef(0);
	const [agentResponseCopying, setAgentResponseCopying] = useState(() =>
		initialAgentResponseCopying(settings),
	);
	const [canvasFrame, setCanvasFrame] = useState(() =>
		initialCanvasFrame(settings),
	);
	const [formatOnSave, setFormatOnSave] = useState(() =>
		initialFormatOnSave(settings),
	);
	const [appearance, setAppearance] = useState(() =>
		parseAppearance(settings.getItem(APPEARANCE_STORAGE_KEY)),
	);
	const [lightTheme, setLightTheme] = useState(() =>
		parseLightTheme(settings.getItem(LIGHT_THEME_STORAGE_KEY)),
	);
	const [darkTheme, setDarkTheme] = useState(() =>
		parseDarkTheme(settings.getItem(DARK_THEME_STORAGE_KEY)),
	);
	const theme = useTheme(appearance, lightTheme, darkTheme);
	const [model, setModel] = useState(() =>
		loadWorkspace(desktop !== undefined, settings, productContent.docs),
	);
	const [, setLayoutRevision] = useState(0);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const editorRef = useRef<GicEditor | null>(null);
	const modelRef = useRef(model);
	modelRef.current = model;
	const openFile = useRef<HTMLInputElement>(null);
	const appUpdate = useAppUpdate(supportsAppUpdates);
	const preview = usePreview(canvasRef);
	const selectGestalten = () => {
		model.doAction(Actions.selectTab(CODE_ID));
		saveWorkspace(model, settings);
		setLayoutRevision((revision) => revision + 1);
	};
	const openDocumentation = (id: string) => {
		const tab = model.getNodeById(documentTabId(id));
		if (tab === undefined) {
			window.alert("This documentation page is unavailable.");
			return;
		}
		for (const parentId of [DOCS_ID, CODE_ID]) {
			const parent = model.getNodeById(parentId);
			if (
				parent instanceof TabNode &&
				parent.getSubLayoutId() === tab.getLayoutId()
			) {
				model.doAction(Actions.selectTab(parentId));
				break;
			}
		}
		model.doAction(Actions.selectTab(tab.getId()));
		saveWorkspace(model, settings);
		setLayoutRevision((revision) => revision + 1);
	};
	const documents = useDocument(formatOnSave, selectGestalten, desktop);
	const documentsRef = useRef(documents);
	documentsRef.current = documents;
	const workspace = useWorkspace(desktop);
	const loadOpencodeModels = (status: ProviderCredentialStatus | null) => {
		const request = ++opencodeModelsRequest.current;
		if (
			desktop === undefined ||
			(status?.opencodeAuthenticated !== true &&
				status?.goAuthenticated !== true &&
				status?.openrouterAuthenticated !== true &&
				status?.codexAuthenticated !== true)
		) {
			setOpencodeModels([]);
			setOpencodeModel("");
			setOpencodeModelError(null);
			return;
		}
		void Promise.allSettled([
			status?.opencodeAuthenticated === true
				? desktop.opencodeModels()
				: Promise.resolve([]),
			status?.goAuthenticated === true
				? desktop.goModels()
				: Promise.resolve([]),
			status?.openrouterAuthenticated === true
				? desktop.openrouterModels()
				: Promise.resolve([]),
			status?.codexAuthenticated === true
				? desktop.codexModels()
				: Promise.resolve([]),
		])
			.then((results) => {
				if (request !== opencodeModelsRequest.current) return;
				const zenModels =
					results[0].status === "fulfilled" ? results[0].value : [];
				const openrouterModels =
					results[2].status === "fulfilled" ? results[2].value : [];
				const codexModels =
					results[3].status === "fulfilled" ? results[3].value : [];
				const goModels =
					results[1].status === "fulfilled" ? results[1].value : [];
				const availableModels = [
					...zenModels,
					...goModels,
					...openrouterModels,
					...codexModels,
				];
				setOpencodeModels(availableModels);
				const enabled = loadEnabledModelIds(settings, availableModels);
				setEnabledModelIds(enabled);
				const preferredErrorIndex =
					loadSelectedModelId(settings).startsWith("openai-codex/") ||
					(status?.codexAuthenticated === true &&
						status.opencodeAuthenticated !== true &&
						status.goAuthenticated !== true &&
						status.openrouterAuthenticated !== true)
						? 3
						: loadSelectedModelId(settings).startsWith("openrouter/") ||
							  (status?.opencodeAuthenticated !== true &&
									status?.goAuthenticated !== true)
							? 2
							: loadSelectedModelId(settings).startsWith("opencode-go/") ||
								  status?.opencodeAuthenticated !== true
								? 1
								: 0;
				const failedProvider =
					results[preferredErrorIndex].status === "rejected"
						? results[preferredErrorIndex]
						: results.find((result) => result.status === "rejected");
				setOpencodeModelError(
					failedProvider?.status === "rejected"
						? modelDiscoveryError(failedProvider.reason)
						: null,
				);
				setOpencodeModel(
					selectedVisibleModelId(
						loadSelectedModelId(settings),
						deriveVisibleModels(availableModels, enabled),
					),
				);
			})
			.catch((error: unknown) => {
				if (request !== opencodeModelsRequest.current) return;
				setOpencodeModels([]);
				setOpencodeModel("");
				setOpencodeModelError(modelDiscoveryError(error));
			});
	};
	const changeModelVisibility = (id: string, enabled: boolean) => {
		if (!opencodeModels.some((model) => model.id === id)) return;
		const next = enabled
			? [...new Set([...enabledModelIds, id])]
			: enabledModelIds.filter((modelId) => modelId !== id);
		saveEnabledModelIds(settings, next);
		setEnabledModelIds(next);
		setOpencodeModel(
			selectedVisibleModelId(
				loadSelectedModelId(settings),
				deriveVisibleModels(opencodeModels, next),
			),
		);
	};
	const changeSelectedModel = (id: string) => {
		const selected = selectedVisibleModelId(
			id,
			deriveVisibleModels(opencodeModels, enabledModelIds),
		);
		saveSelectedModelId(settings, selected);
		setOpencodeModel(selected);
	};
	useEffect(() => {
		if (desktop === undefined) return;
		void desktop
			.providerCredentialStatus()
			.then((status) => {
				setProviderStatus(status);
				loadOpencodeModels(status);
			})
			.catch(() => undefined);
	}, [desktop]);
	const agent = useAgent(
		buildAgentContext(
			documents.documentState.source,
			preview.state.problems,
			preview.state.output,
		),
		documents.sketchId,
		desktop,
		documents.documentId,
		opencodeModel,
		opencodeModel === ""
			? providerStatus?.opencodeAuthenticated === true ||
					providerStatus?.goAuthenticated === true ||
					providerStatus?.openrouterAuthenticated === true ||
					providerStatus?.codexAuthenticated === true
			: opencodeModel.startsWith("openrouter/")
				? providerStatus?.openrouterAuthenticated === true
				: opencodeModel.startsWith("openai-codex/")
					? providerStatus?.codexAuthenticated === true
					: opencodeModel.startsWith("opencode-go/")
						? providerStatus?.goAuthenticated === true
						: providerStatus?.opencodeAuthenticated === true,
	);

	useEffect(() => {
		if (desktop === undefined) return;
		void desktop.setWindowTheme(resolveWindowTheme(appearance)).catch(() => {
			window.alert("GIC could not apply the selected window appearance.");
		});
	}, [appearance, desktop]);

	useEffect(() => {
		if (desktop === undefined) return;
		let disposed = false;
		let unlisten: (() => void) | undefined;
		const handleMenuAction = (action: DesktopMenuAction) => {
			if (action === "new") {
				documentsRef.current.requestNew();
				return;
			}
			if (action === "reveal") {
				void desktop.revealSketchFolder().catch(() => {
					window.alert("GIC could not reveal the sketch folder.");
				});
				return;
			}
			if (action === "open") {
				documentsRef.current.requestDesktopOpen();
				return;
			}
			if (action === "save") {
				documentsRef.current.requestSave();
				return;
			}
			if (action === "saveAs") {
				documentsRef.current.openSaveAs();
				return;
			}
			const editor = editorRef.current;
			if (action === "settings") {
				modelRef.current.doAction(Actions.selectTab(SETTINGS_ID));
				saveWorkspace(modelRef.current, settings);
				setLayoutRevision((revision) => revision + 1);
				return;
			}
			if (action === "format") {
				editor?.focus();
				void editor?.getAction("editor.action.formatDocument")?.run();
				return;
			}
			editor?.focus();
			editor?.trigger("desktop-menu", action, null);
		};
		void desktop
			.onMenuAction(handleMenuAction)
			.then((stopListening) => {
				if (disposed) {
					stopListening();
					return;
				}
				unlisten = stopListening;
			})
			.catch(() => {
				window.alert("GIC could not connect the native application menu.");
			});
		return () => {
			disposed = true;
			unlisten?.();
		};
	}, [desktop]);

	useEffect(() => {
		model.doAction(Actions.renameTab(CODE_ID, "Gestalten"));
	}, [model]);

	useEffect(() => {
		const label = `${documents.documentState.displayName}${documents.documentState.isDirty ? " *" : ""}`;
		model.doAction(Actions.renameTab(EDITOR_ID, label));
	}, [documents.documentState, model]);

	const layoutChanged = (changedModel: Model) => {
		saveWorkspace(changedModel, settings);
		setLayoutRevision((revision) => revision + 1);
	};

	const resetLayout = () => {
		const defaultModel = createDefaultWorkspace(
			desktop !== undefined,
			productContent.docs,
		);
		saveWorkspace(defaultModel, settings);
		setModel(defaultModel);
	};

	const updateAgentResponseCopying = (checked: boolean) => {
		setAgentResponseCopying(checked);
		settings.setItem(AGENT_RESPONSE_COPYING_STORAGE_KEY, String(checked));
	};

	const updateCanvasFrame = (checked: boolean) => {
		setCanvasFrame(checked);
		settings.setItem(CANVAS_FRAME_STORAGE_KEY, String(checked));
	};

	const updateFormatOnSave = (checked: boolean) => {
		setFormatOnSave(checked);
		settings.setItem(FORMAT_ON_SAVE_STORAGE_KEY, String(checked));
	};

	const updateAppearance = (nextAppearance: typeof appearance) => {
		setAppearance(nextAppearance);
		settings.setItem(APPEARANCE_STORAGE_KEY, nextAppearance);
	};

	const updateLightTheme = (nextTheme: typeof lightTheme) => {
		setLightTheme(nextTheme);
		settings.setItem(LIGHT_THEME_STORAGE_KEY, nextTheme);
	};

	const updateDarkTheme = (nextTheme: typeof darkTheme) => {
		setDarkTheme(nextTheme);
		settings.setItem(DARK_THEME_STORAGE_KEY, nextTheme);
	};

	const updateSource = (nextSource: string) => {
		documents.updateSource(nextSource);
		preview.onSourceChange(nextSource);
	};

	const visibleAgentModels = deriveVisibleModels(
		opencodeModels,
		enabledModelIds,
	);
	const activeAgentModel = visibleAgentModels.find(
		(candidate) => candidate.id === opencodeModel,
	);
	let agentDisabledReason: string | undefined;
	if (desktop !== undefined) {
		const needsSave = documents.documentState.kind === "untitled";
		const needsModel = activeAgentModel === undefined;
		if (needsSave && needsModel) {
			agentDisabledReason =
				"Save this sketch and choose an Agent model above, or enable one in Settings.";
		} else if (needsSave) {
			agentDisabledReason = "Save this sketch before using the Agent.";
		} else if (needsModel) {
			agentDisabledReason =
				visibleAgentModels.length === 0
					? "No Agent model enabled. Enable one in Settings."
					: "No Agent model selected. Choose one above.";
		}
	}

	const renderTab = (node: TabNode, values: ITabRenderValues) => {
		if (node.getId() === PROBLEMS_ID) {
			const label = countLabel("Problems", preview.state.problems.length);
			values.content = label;
		}
		if (node.getId() === OUTPUT_ID) {
			const label = countLabel("Output", preview.state.output.length);
			values.content = label;
		}
		if (node.getId() === AGENT_ID) {
			values.content =
				agent.status === "streaming" ? "Agent (responding)" : "Agent";
		}
	};

	const panelFactory = (node: TabNode) => {
		switch (node.getComponent()) {
			case EDITOR_ID:
				return (
					<EditorPanel
						onEditorReady={(editor) => {
							editorRef.current = editor;
							preview.setEditor(editor);
						}}
						onSave={documents.requestSave}
						onRevealSketchFolder={
							desktop === undefined
								? undefined
								: () => {
										void desktop.revealSketchFolder().catch(() => {
											window.alert("GIC could not reveal the sketch folder.");
										});
									}
						}
						onSourceChange={updateSource}
						source={documents.documentState.source}
						theme={theme}
					/>
				);
			case PREVIEW_ID:
				return (
					<PreviewPanel
						canvasFrame={canvasFrame}
						canvasRef={canvasRef}
						isCurrentSourceRendered={preview.state.isCurrentSourceRendered}
						onDownloadStandalone={() => {
							const source = documents.documentState.source;
							if (desktop === undefined) {
								void downloadStandaloneHtml(source);
								return;
							}
							void createStandaloneHtml(source)
								.then((html) =>
									desktop.saveExport("html", new TextEncoder().encode(html)),
								)
								.catch(() =>
									window.alert(
										"GIC could not save the standalone HTML export.",
									),
								);
						}}
						onSavePng={
							desktop === undefined
								? undefined
								: (contents) => desktop.saveExport("png", contents)
						}
					/>
				);
			case PROBLEMS_ID:
				return <ProblemsPanel entries={preview.state.problems} />;
			case OUTPUT_ID:
				return <OutputPanel entries={preview.state.output} />;
			case AGENT_ID:
				return (
					<AgentPanel
						actions={agent}
						allowCopying={agentResponseCopying}
						disabled={agentDisabledReason !== undefined}
						disabledReason={agentDisabledReason}
						messages={agent.messages}
						modelSelection={
							desktop === undefined
								? undefined
								: {
										models: opencodeModels,
										enabledModelIds,
										selectedModel: opencodeModel,
										onModelChange: changeSelectedModel,
									}
						}
						status={agent.status}
						errorMessage={agent.errorMessage}
					/>
				);
			case SETTINGS_ID:
				return (
					<SettingsPanel
						agentResponseCopying={agentResponseCopying}
						appearance={appearance}
						canvasFrame={canvasFrame}
						darkTheme={darkTheme}
						formatOnSave={formatOnSave}
						lightTheme={lightTheme}
						onAgentResponseCopyingChange={updateAgentResponseCopying}
						onAppearanceChange={updateAppearance}
						onCanvasFrameChange={updateCanvasFrame}
						onDarkThemeChange={updateDarkTheme}
						onFormatOnSaveChange={updateFormatOnSave}
						onLightThemeChange={updateLightTheme}
						onResetLayout={resetLayout}
						workspace={desktop === undefined ? undefined : workspace}
						desktop={desktop}
						providerStatus={providerStatus}
						models={opencodeModels}
						enabledModelIds={enabledModelIds}
						modelError={opencodeModelError}
						onRetryModels={() => loadOpencodeModels(providerStatus)}
						onModelVisibilityChange={changeModelVisibility}
						onProviderAuthenticated={(status) => {
							setProviderStatus(status);
							loadOpencodeModels(status);
						}}
					/>
				);
			case EXAMPLES_ID:
				return (
					<ExamplesPanel
						examples={productContent.examples}
						onOpen={documents.requestExample}
					/>
				);
			case DOC_COMPONENT: {
				const doc = docsByTabId.get(node.getId());
				return doc === undefined ? (
					<div className="workspace-panel padded-panel">
						This documentation page is unavailable.
					</div>
				) : (
					<DocsPanel doc={doc} docIds={docIds} onOpen={openDocumentation} />
				);
			}
			case ABOUT_ID:
				return <AboutPanel content={productContent.about} />;
			default:
				throw new Error(`Unknown layout panel '${node.getComponent()}'.`);
		}
	};

	return (
		<main className="app-shell">
			{desktop === undefined && (
				<header className="application-chrome">
					<Menubar
						aria-label="Application menu"
						className="application-menubar"
					>
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
			)}
			<div className="application-layout">
				<Layout
					factory={panelFactory}
					model={model}
					onModelChange={layoutChanged}
					onRenderDragRect={renderDragBadge}
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
