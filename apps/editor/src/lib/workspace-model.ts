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
import type { DocumentationContent } from "@giclang/content/model";
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
export const DOC_COMPONENT = "documentation";

const APPLICATION_TABSET_ID = "application-tabs";
const CODE_SUBLAYOUT_ID = "code-workspace";
const DOCS_SUBLAYOUT_ID = "docs-workspace";
const DOCUMENTATION_TABSET_ID = "documentation-tabset";
const EDITOR_TABSET_ID = "editor-tabset";
const PREVIEW_TABSET_ID = "preview-tabset";
const PROBLEMS_TABSET_ID = "problems-tabset";
const OUTPUT_TABSET_ID = "output-tabset";
export const AGENT_ID = "agent";
const LEGACY_TUTOR_ID = "tutor";
const STORAGE_KEY = "gic.workspaceLayout";
const STORAGE_VERSION = 8;

interface StoredWorkspace {
	layout: IJsonModel;
	version: number;
}

export function documentTabId(id: string): string {
	return `documentation:${id}`;
}

function documentationTabs(
	docs: readonly Pick<DocumentationContent, "id" | "title">[],
) {
	return docs.map((doc) => ({
		type: "tab" as const,
		id: documentTabId(doc.id),
		name: doc.title,
		component: DOC_COMPONENT,
	}));
}

function defaultLayout(
	docs: readonly Pick<DocumentationContent, "id" | "title">[],
): IJsonModel {
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
										{
											type: "tab",
											id: AGENT_ID,
											name: "Agent",
											component: AGENT_ID,
										},
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
			[DOCS_SUBLAYOUT_ID]: {
				type: "tab",
				layout: {
					type: "row",
					children: [
						{
							type: "tabset",
							id: DOCUMENTATION_TABSET_ID,
							enableDeleteWhenEmpty: false,
							children: documentationTabs(docs),
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
							subLayoutId: DOCS_SUBLAYOUT_ID,
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

export function createDefaultWorkspace(
	docs: readonly Pick<DocumentationContent, "id" | "title">[],
): Model {
	return Model.fromJson(defaultLayout(docs));
}

export function loadWorkspace(
	settings: ApplicationSettings = localStorage,
	docs: readonly Pick<DocumentationContent, "id" | "title">[],
): Model {
	const stored = settings.getItem(STORAGE_KEY);
	if (stored === null) {
		return createDefaultWorkspace(docs);
	}
	try {
		const parsed: unknown = JSON.parse(stored);
		if (
			typeof parsed !== "object" ||
			parsed === null ||
			!("version" in parsed) ||
			(parsed.version !== STORAGE_VERSION &&
				parsed.version !== STORAGE_VERSION - 1 &&
				parsed.version !== STORAGE_VERSION - 2) ||
			!("layout" in parsed)
		) {
			return createDefaultWorkspace(docs);
		}
		const storedWorkspace = parsed as StoredWorkspace;
		const layout =
			storedWorkspace.version < STORAGE_VERSION
				? migrateDocumentationLayout(storedWorkspace.layout, docs)
				: storedWorkspace.layout;
		layout.global = {
			...layout.global,
			tabSetEnableClose: true,
		};
		ensureDocumentationTabset(layout, docs);
		const model = Model.fromJson(layout);
		ensureAgent(model);
		reconcileDocumentationTabs(model, docs);
		validateWorkspace(model, docs);
		saveWorkspace(model, settings);
		return model;
	} catch {
		return createDefaultWorkspace(docs);
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

function migrateDocumentationLayout(
	layout: IJsonModel,
	docs: readonly Pick<DocumentationContent, "id" | "title">[],
): IJsonModel {
	const migrated = structuredClone(layout);
	const docsTab = findTabJson(migrated.layout, DOCS_ID);
	if (docsTab === undefined || docsTab.component !== DOCS_ID) {
		throw new Error("Legacy Docs panel is invalid.");
	}
	delete docsTab.component;
	docsTab.subLayoutId = DOCS_SUBLAYOUT_ID;
	migrated.subLayouts = {
		...migrated.subLayouts,
		[DOCS_SUBLAYOUT_ID]: {
			type: "tab",
			layout: {
				type: "row",
				children: [
					{
						type: "tabset",
						id: DOCUMENTATION_TABSET_ID,
						enableDeleteWhenEmpty: false,
						children: documentationTabs(docs),
					},
				],
			},
		},
	};
	return migrated;
}

function findTabJson(
	node: IJsonModel["layout"],
	id: string,
): Record<string, unknown> | undefined {
	if (node.id === id) return node as Record<string, unknown>;
	for (const child of node.children ?? []) {
		const found = findTabJson(child, id);
		if (found !== undefined) return found;
	}
	return undefined;
}

function ensureDocumentationTabset(
	layout: IJsonModel,
	docs: readonly Pick<DocumentationContent, "id" | "title">[],
): void {
	const docsLayout = layout.subLayouts?.[DOCS_SUBLAYOUT_ID]?.layout;
	if (docsLayout === undefined) {
		throw new Error("Docs sublayout is invalid.");
	}
	if (findTabJson(docsLayout, DOCUMENTATION_TABSET_ID) !== undefined) return;
	const missingDocs = docs.filter(
		(doc) =>
			findTabJson(layout.layout, documentTabId(doc.id)) === undefined &&
			!Object.values(layout.subLayouts ?? {}).some(
				(subLayout) =>
					findTabJson(subLayout.layout, documentTabId(doc.id)) !== undefined,
			),
	);
	if (missingDocs.length === 0) return;
	(docsLayout.children ??= []).push({
		type: "tabset",
		id: DOCUMENTATION_TABSET_ID,
		enableDeleteWhenEmpty: false,
		children: documentationTabs(missingDocs),
	});
}

function reconcileDocumentationTabs(
	model: Model,
	docs: readonly Pick<DocumentationContent, "id" | "title">[],
): void {
	const documents = new Map(docs.map((doc) => [documentTabId(doc.id), doc]));
	if (documents.size !== docs.length) {
		throw new Error("Documentation identifiers are not unique.");
	}
	const tabs: TabNode[] = [];
	model.visitNodes((node) => {
		if (node instanceof TabNode && node.getComponent() === DOC_COMPONENT) {
			tabs.push(node);
		}
	});
	const documentationTabset = model.getNodeById(DOCUMENTATION_TABSET_ID);
	const hasDocumentationTabset = documentationTabset instanceof TabSetNode;
	if (hasDocumentationTabset) {
		model.doAction(
			Actions.updateNodeAttributes(DOCUMENTATION_TABSET_ID, {
				enableDeleteWhenEmpty: false,
			}),
		);
	}
	for (const tab of tabs) {
		if (!tab.getId().startsWith("documentation:")) {
			throw new Error("Documentation tab identifier is invalid.");
		}
	}
	for (const [tabId, doc] of documents) {
		const tab = model.getNodeById(tabId);
		if (tab === undefined) {
			if (!hasDocumentationTabset) {
				throw new Error("Docs sublayout is invalid.");
			}
			model.doAction(
				Actions.addTab(
					{
						id: tabId,
						name: doc.title,
						component: DOC_COMPONENT,
					},
					DOCUMENTATION_TABSET_ID,
					DockLocation.CENTER,
					-1,
					false,
				),
			);
		} else if (
			!(tab instanceof TabNode) ||
			tab.getComponent() !== DOC_COMPONENT
		) {
			throw new Error(`Documentation tab '${tabId}' is invalid.`);
		} else if (tab.getName() !== doc.title) {
			model.doAction(Actions.renameTab(tabId, doc.title));
		}
	}
	for (const tab of tabs) {
		if (!documents.has(tab.getId())) {
			model.doAction(Actions.deleteTab(tab.getId()));
		}
	}
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

function ensureAgent(model: Model): void {
	const legacyTabs: TabNode[] = [];
	model.visitNodes((node) => {
		if (node instanceof TabNode && node.getComponent() === LEGACY_TUTOR_ID) {
			legacyTabs.push(node);
		}
	});
	for (const legacyTab of legacyTabs) {
		model.doAction(Actions.deleteTab(legacyTab.getId()));
	}
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

function validateWorkspace(
	model: Model,
	docs: readonly Pick<DocumentationContent, "id" | "title">[],
): void {
	const applicationTabset = model.getNodeById(APPLICATION_TABSET_ID);
	const code = requireTab(model, CODE_ID);
	const docsTab = requireTab(model, DOCS_ID);
	if (
		!(applicationTabset instanceof TabSetNode) ||
		!(code.getParent() instanceof TabSetNode) ||
		code.getLayoutId() !== Model.MAIN_LAYOUT_ID ||
		code.getSubLayoutId() !== CODE_SUBLAYOUT_ID ||
		!(docsTab.getParent() instanceof TabSetNode) ||
		docsTab.getLayoutId() !== Model.MAIN_LAYOUT_ID ||
		docsTab.getSubLayoutId() !== DOCS_SUBLAYOUT_ID
	) {
		throw new Error("Workspace sublayout is invalid.");
	}
	for (const panelId of [SETTINGS_ID, EXAMPLES_ID, ABOUT_ID]) {
		validatePanel(model, panelId, APPLICATION_TABSET_ID);
	}
	validatePanel(model, EDITOR_ID, EDITOR_TABSET_ID);
	validatePanel(model, PREVIEW_ID, PREVIEW_TABSET_ID);
	validatePanel(model, PROBLEMS_ID, PROBLEMS_TABSET_ID);
	validatePanel(model, OUTPUT_ID, OUTPUT_TABSET_ID);
	validatePanel(model, AGENT_ID, OUTPUT_TABSET_ID);

	for (const doc of docs) {
		const tab = requireTab(model, documentTabId(doc.id));
		if (tab.getComponent() !== DOC_COMPONENT) {
			throw new Error(`Documentation tab '${doc.id}' is invalid.`);
		}
	}
}
