// ABOUTME: Defines and persists the browser IDE's FlexLayout workspace model.
// ABOUTME: Places headerless Code panes around the central Preview and status stack.

import { Model, TabNode, TabSetNode, type IJsonModel } from "flexlayout-react";

export const EDITOR_ID = "editor";
export const PREVIEW_ID = "preview";
export const PREVIEW_TABSET_ID = "preview-tabset";
export const PROBLEMS_ID = "problems";
export const OUTPUT_ID = "output";
export const TUTOR_ID = "tutor";

const EDITOR_TABSET_ID = "editor-tabset";
const STATUS_TABSET_ID = "status-tabset";
const TUTOR_TABSET_ID = "tutor-tabset";
const STORAGE_KEY = "gic.workspaceLayout";
const STORAGE_VERSION = 4;

interface StoredWorkspace {
	layout: IJsonModel;
	version: typeof STORAGE_VERSION;
}

function defaultLayout(): IJsonModel {
	return {
		global: {
			tabEnableClose: false,
			tabEnableDrag: false,
			tabEnableFloat: false,
			tabEnableRenderOnDemand: false,
			tabSetEnableClose: false,
			tabSetEnableDrag: false,
			tabSetEnableDrop: false,
			tabSetEnableMaximize: false,
		},
		borders: [],
		layout: {
			type: "row",
			children: [
				{
					type: "tabset",
					id: EDITOR_TABSET_ID,
					enableTabStrip: false,
					weight: 35,
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
					type: "row",
					weight: 30,
					children: [
						{
							type: "tabset",
							id: PREVIEW_TABSET_ID,
							enableTabStrip: false,
							weight: 55,
							children: [
								{
									type: "tab",
									id: PREVIEW_ID,
									name: "Preview",
									component: PREVIEW_ID,
								},
							],
						},
						{
							type: "tabset",
							id: STATUS_TABSET_ID,
							selected: 0,
							weight: 45,
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
				},
				{
					type: "tabset",
					id: TUTOR_TABSET_ID,
					enableTabStrip: false,
					weight: 35,
					children: [
						{
							type: "tab",
							id: TUTOR_ID,
							name: "Tutor",
							component: TUTOR_ID,
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

function validatePanel(model: Model, panelId: string, tabsetId: string): void {
	const panel = model.getNodeById(panelId);
	const tabset = model.getNodeById(tabsetId);
	if (
		!(panel instanceof TabNode) ||
		panel.getComponent() !== panelId ||
		!(tabset instanceof TabSetNode) ||
		panel.getParent() !== tabset
	) {
		throw new Error(`Workspace panel '${panelId}' is invalid.`);
	}
}

function validateWorkspace(model: Model): void {
	validatePanel(model, EDITOR_ID, EDITOR_TABSET_ID);
	validatePanel(model, PREVIEW_ID, PREVIEW_TABSET_ID);
	validatePanel(model, PROBLEMS_ID, STATUS_TABSET_ID);
	validatePanel(model, OUTPUT_ID, STATUS_TABSET_ID);
	validatePanel(model, TUTOR_ID, TUTOR_TABSET_ID);
}
