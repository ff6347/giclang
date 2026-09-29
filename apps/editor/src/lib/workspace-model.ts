// ABOUTME: Defines and persists the browser IDE's complete FlexLayout model.
// ABOUTME: Keeps application tabs and the draggable Code sublayout in one model.

import {
	Actions,
	DockLocation,
	Model,
	TabNode,
	TabSetNode,
	type IJsonModel,
} from "flexlayout-react";
import type { ApplicationSettings } from "./application-settings.ts";

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
const PROBLEMS_TABSET_ID = "problems-tabset";
const OUTPUT_TABSET_ID = "output-tabset";
export const AGENT_ID = "agent";
const LEGACY_TUTOR_ID = "tutor";
const STORAGE_KEY = "gic.workspaceLayout";
const STORAGE_VERSION = 7;

interface StoredWorkspace {
	layout: IJsonModel;
	version: typeof STORAGE_VERSION;
}

function defaultLayout(includeAgent: boolean): IJsonModel {
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
							weight: 52,
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
							weight: 48,
							children: [
								{
									type: "tabset",
									id: PREVIEW_TABSET_ID,
									weight: 33,
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
									id: OUTPUT_TABSET_ID,
									weight: 34,
									children: [
										{
											type: "tab",
											id: OUTPUT_ID,
											name: "Output",
											component: OUTPUT_ID,
										},
										...(includeAgent
											? [
													{
														type: "tab" as const,
														id: AGENT_ID,
														name: "Agent",
														component: AGENT_ID,
													},
												]
											: []),
									],
								},
								{
									type: "tabset",
									id: PROBLEMS_TABSET_ID,
									weight: 33,
									children: [
										{
											type: "tab",
											id: PROBLEMS_ID,
											name: "Problems",
											component: PROBLEMS_ID,
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

export function createDefaultWorkspace(includeAgent: boolean): Model {
	return Model.fromJson(defaultLayout(includeAgent));
}

export function loadWorkspace(
	includeAgent: boolean,
	settings: ApplicationSettings = localStorage,
): Model {
	const stored = settings.getItem(STORAGE_KEY);
	if (stored === null) {
		return createDefaultWorkspace(includeAgent);
	}
	try {
		const parsed: unknown = JSON.parse(stored);
		if (
			typeof parsed !== "object" ||
			parsed === null ||
			!("version" in parsed) ||
			(parsed.version !== STORAGE_VERSION &&
				parsed.version !== STORAGE_VERSION - 1) ||
			!("layout" in parsed)
		) {
			return createDefaultWorkspace(includeAgent);
		}
		const layout = (parsed as StoredWorkspace).layout;
		layout.global = {
			...layout.global,
			tabSetEnableClose: true,
		};
		const model = Model.fromJson(layout);
		reconcileAgent(model, includeAgent);
		validateWorkspace(model, includeAgent);
		saveWorkspace(model, settings);
		return model;
	} catch {
		return createDefaultWorkspace(includeAgent);
	}
}

export function saveWorkspace(
	model: Model,
	settings: ApplicationSettings = localStorage,
): void {
	const stored: StoredWorkspace = {
		layout: model.toJson(),
		version: STORAGE_VERSION,
	};
	settings.setItem(STORAGE_KEY, JSON.stringify(stored));
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

function reconcileAgent(model: Model, includeAgent: boolean): void {
	const unavailableTabs: TabNode[] = [];
	model.visitNodes((node) => {
		if (
			node instanceof TabNode &&
			(node.getComponent() === LEGACY_TUTOR_ID ||
				(!includeAgent &&
					(node.getComponent() === AGENT_ID || node.getId() === AGENT_ID)))
		) {
			unavailableTabs.push(node);
		}
	});
	for (const tab of unavailableTabs) {
		model.doAction(Actions.deleteTab(tab.getId()));
	}
	if (!includeAgent) return;
	const existing = model.getNodeById(AGENT_ID);
	if (
		existing instanceof TabNode &&
		existing.getParent()?.getId() === OUTPUT_TABSET_ID
	) {
		return;
	}
	if (existing instanceof TabNode) model.doAction(Actions.deleteTab(AGENT_ID));
	model.doAction(
		Actions.addTab(
			{ id: AGENT_ID, name: "Agent", component: AGENT_ID },
			OUTPUT_TABSET_ID,
			DockLocation.CENTER,
			-1,
		),
	);
}

function validateWorkspace(model: Model, includeAgent: boolean): void {
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
	validatePanel(model, PROBLEMS_ID, PROBLEMS_TABSET_ID);
	validatePanel(model, OUTPUT_ID, OUTPUT_TABSET_ID);
	if (includeAgent) validatePanel(model, AGENT_ID, OUTPUT_TABSET_ID);
}
