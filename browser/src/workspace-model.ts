// ABOUTME: Defines and persists the browser IDE's FlexLayout workspace model.
// ABOUTME: Provides panel visibility actions without coupling layout state to React.

import {
	Actions,
	BorderNode,
	Model,
	TabNode,
	TabSetNode,
	type IJsonModel,
} from "flexlayout-react";

export const EDITOR_ID = "editor";
export const PREVIEW_ID = "preview";
export const PREVIEW_TABSET_ID = "preview-tabset";
export const SETTINGS_ID = "settings";
export const PROBLEMS_ID = "problems";
export const OUTPUT_ID = "output";
export const TUTOR_ID = "tutor";

const STORAGE_KEY = "gic.workspaceLayout";
const STORAGE_VERSION = 2;

interface StoredWorkspace {
	layout: IJsonModel;
	version: typeof STORAGE_VERSION;
}

function defaultLayout(): IJsonModel {
	return {
		global: {
			borderEnableDrop: false,
			tabEnableClose: false,
			tabEnableDrag: false,
			tabEnableFloat: false,
			tabEnableRenderOnDemand: false,
			tabSetEnableClose: false,
			tabSetEnableDrag: false,
			tabSetEnableDrop: false,
			tabSetEnableMaximize: false,
		},
		borders: [
			{
				type: "border",
				location: "left",
				selected: 0,
				size: 480,
				children: [
					{
						type: "tab",
						id: EDITOR_ID,
						name: "Editor",
						component: EDITOR_ID,
					},
				],
			},
			{
				type: "border",
				location: "right",
				selected: 0,
				size: 320,
				children: [
					{
						type: "tab",
						id: TUTOR_ID,
						name: "Tutor",
						component: TUTOR_ID,
					},
				],
			},
			{
				type: "border",
				location: "bottom",
				selected: 0,
				size: 200,
				children: [
					{
						type: "tab",
						id: PROBLEMS_ID,
						name: "Problems",
						component: PROBLEMS_ID,
					},
					{
						type: "tab",
						id: OUTPUT_ID,
						name: "Output",
						component: OUTPUT_ID,
					},
				],
			},
		],
		layout: {
			type: "row",
			children: [
				{
					type: "tabset",
					id: PREVIEW_TABSET_ID,
					selected: 0,
					children: [
						{
							type: "tab",
							id: PREVIEW_ID,
							name: "Preview",
							component: PREVIEW_ID,
						},
						{
							type: "tab",
							id: SETTINGS_ID,
							name: "Settings",
							component: SETTINGS_ID,
						},
					],
				},
			],
		},
	};
}

export function createDefaultWorkspace(): Model {
	return Model.fromJson(defaultLayout());
}

export function loadWorkspace(): Model {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === null) {
		return createDefaultWorkspace();
	}
	try {
		const parsed: unknown = JSON.parse(stored);
		if (
			typeof parsed !== "object" ||
			parsed === null ||
			!("version" in parsed) ||
			parsed.version !== STORAGE_VERSION ||
			!("layout" in parsed)
		) {
			return createDefaultWorkspace();
		}
		const model = Model.fromJson((parsed as StoredWorkspace).layout);
		validateWorkspace(model);
		return model;
	} catch {
		return createDefaultWorkspace();
	}
}

export function saveWorkspace(model: Model): void {
	const stored: StoredWorkspace = {
		layout: model.toJson(),
		version: STORAGE_VERSION,
	};
	localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

function borderFor(model: Model, tabId: string): BorderNode {
	const node = model.getNodeById(tabId);
	if (!(node instanceof TabNode)) {
		throw new Error(`Workspace tab '${tabId}' not found.`);
	}
	const parent = node.getParent();
	if (!(parent instanceof BorderNode)) {
		throw new Error(`Workspace tab '${tabId}' is not in a border.`);
	}
	return parent;
}

function validateWorkspace(model: Model): void {
	for (const panelId of [EDITOR_ID, PROBLEMS_ID, OUTPUT_ID, TUTOR_ID]) {
		const panel = model.getNodeById(panelId);
		if (!(panel instanceof TabNode) || panel.getComponent() !== panelId) {
			throw new Error(`Workspace panel '${panelId}' is invalid.`);
		}
		borderFor(model, panelId);
	}
	const previewTabset = model.getNodeById(PREVIEW_TABSET_ID);
	if (!(previewTabset instanceof TabSetNode)) {
		throw new Error("Workspace preview is invalid.");
	}
	for (const panelId of [PREVIEW_ID, SETTINGS_ID]) {
		const panel = model.getNodeById(panelId);
		if (
			!(panel instanceof TabNode) ||
			panel.getComponent() !== panelId ||
			panel.getParent() !== previewTabset
		) {
			throw new Error(`Workspace panel '${panelId}' is invalid.`);
		}
	}
}

export function isBorderVisible(model: Model, tabId: string): boolean {
	return borderFor(model, tabId).getSelected() !== -1;
}

export function collapseSelectedCentralTab(
	model: Model,
	tabId: string,
): boolean {
	const node = model.getNodeById(PREVIEW_TABSET_ID);
	if (
		!(node instanceof TabSetNode) ||
		node.getSelectedNode()?.getId() !== tabId
	) {
		return false;
	}
	model.doAction(
		Actions.updateNodeAttributes(PREVIEW_TABSET_ID, {
			selected: -1,
		}),
	);
	return true;
}

export function showProblemsWhenLowerPanelIsHidden(model: Model): void {
	if (!isBorderVisible(model, PROBLEMS_ID)) {
		model.doAction(Actions.selectTab(PROBLEMS_ID));
	}
}
