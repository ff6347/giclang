// ABOUTME: Defines and persists the browser IDE's complete FlexLayout model.
// ABOUTME: Keeps application tabs and the draggable Code sublayout in one model.

import {
	Actions,
	Model,
	TabNode,
	TabSetNode,
	type IJsonModel,
} from "flexlayout-react";

export const CODE_ID = "code";
export const SETTINGS_ID = "settings";
export const EXAMPLES_ID = "examples";
export const DOCS_ID = "docs";
export const ABOUT_ID = "about";
export const EDITOR_ID = "editor";
export const PREVIEW_ID = "preview";
export const PROBLEMS_ID = "problems";
export const OUTPUT_ID = "output";

const APPLICATION_TABSET_ID = "application-tabs";
const CODE_SUBLAYOUT_ID = "code-workspace";
const EDITOR_TABSET_ID = "editor-tabset";
const PREVIEW_TABSET_ID = "preview-tabset";
const STATUS_TABSET_ID = "status-tabset";
const TUTOR_ID = "tutor";
const STORAGE_KEY = "gic.workspaceLayout";
const STORAGE_VERSION = 5;

interface StoredWorkspace {
	layout: IJsonModel;
	version: typeof STORAGE_VERSION;
}

function defaultLayout(): IJsonModel {
	return {
		global: {
			tabEnableClose: false,
			tabEnableRenderOnDemand: false,
			tabSetEnableClose: true,
		},
		subLayouts: {
			[CODE_SUBLAYOUT_ID]: {
				type: "tab",
				layout: {
					type: "row",
					children: [
						{
							type: "tabset",
							id: EDITOR_TABSET_ID,
							weight: 35,
							children: [
								{
									type: "tab",
									id: EDITOR_ID,
									name: "Untitled sketch",
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
					],
				},
			},
		},
		borders: [],
		layout: {
			type: "row",
			children: [
				{
					type: "tabset",
					id: APPLICATION_TABSET_ID,
					selected: 0,
					children: [
						{
							type: "tab",
							id: CODE_ID,
							name: "Gestalten",
							subLayoutId: CODE_SUBLAYOUT_ID,
						},
						{
							type: "tab",
							id: SETTINGS_ID,
							name: "Settings",
							component: SETTINGS_ID,
						},
						{
							type: "tab",
							id: EXAMPLES_ID,
							name: "Examples",
							component: EXAMPLES_ID,
						},
						{
							type: "tab",
							id: DOCS_ID,
							name: "Docs",
							component: DOCS_ID,
						},
						{
							type: "tab",
							id: ABOUT_ID,
							name: "About",
							component: ABOUT_ID,
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
		const layout = (parsed as StoredWorkspace).layout;
		layout.global = {
			...layout.global,
			tabSetEnableClose: true,
		};
		const model = Model.fromJson(layout);
		const removedTutor = removeTutor(model);
		validateWorkspace(model);
		if (removedTutor) saveWorkspace(model);
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

function requireTab(model: Model, tabId: string): TabNode {
	const tab = model.getNodeById(tabId);
	if (!(tab instanceof TabNode)) {
		throw new Error(`Workspace tab '${tabId}' is invalid.`);
	}
	return tab;
}

function validatePanel(model: Model, panelId: string, tabsetId: string): void {
	const panel = requireTab(model, panelId);
	const tabset = model.getNodeById(tabsetId);
	if (
		panel.getComponent() !== panelId ||
		!(tabset instanceof TabSetNode) ||
		panel.getParent() !== tabset
	) {
		throw new Error(`Workspace panel '${panelId}' is invalid.`);
	}
}

function removeTutor(model: Model): boolean {
	if (!(model.getNodeById(TUTOR_ID) instanceof TabNode)) return false;
	model.doAction(Actions.deleteTab(TUTOR_ID));
	return true;
}

function validateWorkspace(model: Model): void {
	const applicationTabset = model.getNodeById(APPLICATION_TABSET_ID);
	const code = requireTab(model, CODE_ID);
	if (
		!(applicationTabset instanceof TabSetNode) ||
		code.getParent() !== applicationTabset ||
		code.getSubLayoutId() !== CODE_SUBLAYOUT_ID
	) {
		throw new Error("Code sublayout is invalid.");
	}
	for (const panelId of [SETTINGS_ID, EXAMPLES_ID, DOCS_ID, ABOUT_ID]) {
		validatePanel(model, panelId, APPLICATION_TABSET_ID);
	}
	validatePanel(model, EDITOR_ID, EDITOR_TABSET_ID);
	validatePanel(model, PREVIEW_ID, PREVIEW_TABSET_ID);
	validatePanel(model, PROBLEMS_ID, STATUS_TABSET_ID);
	validatePanel(model, OUTPUT_ID, STATUS_TABSET_ID);
}
