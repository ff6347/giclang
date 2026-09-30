// ABOUTME: Verifies Agent availability and documentation tabs in persisted workspaces.
// ABOUTME: Covers defaults, migration, reconciliation, and invalid saved layouts.

import assert from "node:assert/strict";
import test from "node:test";
import { Actions, DockLocation, TabNode } from "flexlayout-react";
import type { IJsonModel } from "flexlayout-react";
import type { DocumentationContent } from "@giclang/content/model";
import type { ApplicationSettings } from "../lib/application-settings.ts";
import {
	AGENT_ID,
	CODE_ID,
	DESCRIPTION_ID,
	DOC_COMPONENT,
	DOCS_ID,
	SKETCHES_ID,
	documentTabId,
	createDefaultWorkspace,
	loadWorkspace,
	saveWorkspace,
} from "../lib/workspace-model.ts";

class MemorySettings implements ApplicationSettings {
	readonly values = new Map<string, string>();

	getItem(key: string): string | null {
		return this.values.get(key) ?? null;
	}

	setItem(key: string, value: string): void {
		this.values.set(key, value);
	}
}

const docs: readonly Pick<DocumentationContent, "id" | "title">[] = [
	{ id: "colors", title: "Colors" },
	{ id: "drawing", title: "Drawing" },
];

test("desktop retains Agent after loading a browser workspace", () => {
	const settings = new MemorySettings();
	const desktop = createDefaultWorkspace(true, docs);
	assert.ok(desktop.getNodeById(AGENT_ID) instanceof TabNode);
	const sketches = desktop.getNodeById(SKETCHES_ID);
	assert.ok(sketches instanceof TabNode);
	assert.equal(sketches.getName(), "Sketches");
	saveWorkspace(desktop, settings);

	const browser = loadWorkspace(false, settings, docs);
	assert.equal(browser.getNodeById(AGENT_ID), undefined);
	assert.equal(browser.getNodeById(SKETCHES_ID), undefined);

	const restoredDesktop = loadWorkspace(true, settings, docs);
	assert.ok(restoredDesktop.getNodeById(AGENT_ID) instanceof TabNode);
	assert.ok(restoredDesktop.getNodeById(SKETCHES_ID) instanceof TabNode);
	assert.equal(
		restoredDesktop.getNodeById(AGENT_ID)?.getParent()?.getId(),
		"output-tabset",
	);
});

function documentTabs(model: ReturnType<typeof createDefaultWorkspace>) {
	const tabs: TabNode[] = [];
	model.visitNodes((node) => {
		if (node instanceof TabNode && node.getComponent() === DOC_COMPONENT) {
			tabs.push(node);
		}
	});
	return tabs;
}

function storedLayout(settings: MemorySettings): IJsonModel {
	const stored = settings.getItem("gic.workspaceLayout");
	assert.ok(stored);
	return JSON.parse(stored).layout as IJsonModel;
}

function legacyLayout(includeAgent = true): IJsonModel {
	const layout = createDefaultWorkspace(includeAgent, docs).toJson();
	const docsTab = findTab(layout.layout, DOCS_ID);
	assert.ok(docsTab);
	delete docsTab.subLayoutId;
	docsTab.component = DOCS_ID;
	delete layout.subLayouts?.["docs-workspace"];
	return layout;
}

function findTab(
	node: unknown,
	id: string,
): Record<string, unknown> | undefined {
	if (typeof node !== "object" || node === null) return undefined;
	const record = node as Record<string, unknown>;
	if (record.id === id) return record;
	if (!Array.isArray(record.children)) return undefined;
	for (const child of record.children) {
		const found = findTab(child, id);
		if (found !== undefined) return found;
	}
	return undefined;
}

test("creates one ordered documentation tab in the Docs sublayout", () => {
	const model = createDefaultWorkspace(true, docs);
	const docsTab = model.getNodeById(DOCS_ID);

	assert.ok(docsTab instanceof TabNode);
	assert.equal(docsTab.getSubLayoutId(), "docs-workspace");
	assert.deepEqual(
		documentTabs(model).map((tab) => ({
			id: tab.getId(),
			name: tab.getName(),
			component: tab.getComponent(),
		})),
		[
			{ id: documentTabId("colors"), name: "Colors", component: DOC_COMPONENT },
			{
				id: documentTabId("drawing"),
				name: "Drawing",
				component: DOC_COMPONENT,
			},
		],
	);
});

test("preserves a moved documentation tab through serialization", () => {
	const settings = new MemorySettings();
	const model = createDefaultWorkspace(true, docs);
	model.doAction(
		Actions.moveNode(
			documentTabId("colors"),
			"editor-tabset",
			DockLocation.CENTER,
			-1,
		),
	);
	saveWorkspace(model, settings);

	const loaded = loadWorkspace(true, settings, docs);
	assert.equal(
		loaded.getNodeById(documentTabId("colors"))?.getParent()?.getId(),
		"editor-tabset",
	);
	loaded.doAction(
		Actions.moveNode(
			documentTabId("colors"),
			"documentation-tabset",
			DockLocation.CENTER,
			-1,
		),
	);
	saveWorkspace(loaded, settings);

	assert.equal(
		loadWorkspace(true, settings, docs)
			.getNodeById(documentTabId("colors"))
			?.getParent()
			?.getId(),
		"documentation-tabset",
	);
});

test("retains both docked workspaces and a moved document after reload", () => {
	const settings = new MemorySettings();
	const model = createDefaultWorkspace(true, docs);
	model.doAction(
		Actions.moveNode(CODE_ID, "application-tabs", DockLocation.LEFT, -1),
	);
	model.doAction(
		Actions.moveNode(
			documentTabId("colors"),
			"editor-tabset",
			DockLocation.CENTER,
			-1,
		),
	);
	saveWorkspace(model, settings);

	const loaded = loadWorkspace(true, settings, docs);
	assert.notEqual(
		loaded.getNodeById(CODE_ID)?.getParent()?.getId(),
		"application-tabs",
	);
	assert.equal(
		loaded.getNodeById(documentTabId("colors"))?.getParent()?.getId(),
		"editor-tabset",
	);
	const loadedDocs = loaded.getNodeById(DOCS_ID);
	assert.ok(loadedDocs instanceof TabNode);
	assert.equal(loadedDocs.getSubLayoutId(), "docs-workspace");
});

test("keeps an empty Docs tabset when every document is moved", () => {
	const settings = new MemorySettings();
	const model = createDefaultWorkspace(true, docs);
	for (const doc of docs) {
		model.doAction(
			Actions.moveNode(
				documentTabId(doc.id),
				"editor-tabset",
				DockLocation.CENTER,
				-1,
			),
		);
	}
	saveWorkspace(model, settings);

	const loaded = loadWorkspace(true, settings, docs);
	const docsTab = loaded.getNodeById(DOCS_ID);
	assert.ok(docsTab instanceof TabNode);
	assert.equal(docsTab.getSubLayoutId(), "docs-workspace");
	for (const doc of docs) {
		assert.equal(
			loaded.getNodeById(documentTabId(doc.id))?.getParent()?.getId(),
			"editor-tabset",
		);
	}
	loaded.doAction(
		Actions.moveNode(
			documentTabId("colors"),
			"documentation-tabset",
			DockLocation.CENTER,
			-1,
		),
	);
	assert.equal(
		loaded.getNodeById(documentTabId("colors"))?.getParent()?.getId(),
		"documentation-tabset",
	);
});

for (const version of [6, 7]) {
	test(`migrates version ${version} layouts without moving application tabs`, () => {
		const settings = new MemorySettings();
		const layout = legacyLayout();
		const applicationTabs = findTab(layout.layout, "application-tabs");
		assert.ok(applicationTabs);
		applicationTabs.selected = 2;
		settings.setItem(
			"gic.workspaceLayout",
			JSON.stringify({ version, layout }),
		);

		const model = loadWorkspace(true, settings, docs);
		assert.equal(
			model.getNodeById(CODE_ID)?.getParent()?.getId(),
			"application-tabs",
		);
		assert.deepEqual(
			documentTabs(model).map((tab) => tab.getId()),
			docs.map((doc) => documentTabId(doc.id)),
		);
		assert.equal(storedLayout(settings).layout.type, "row");
	});
}

for (const includeAgent of [false, true]) {
	test(`migrates the ${includeAgent ? "desktop" : "browser"} version 8 layout without resetting selected tabs or sizes`, () => {
		const settings = new MemorySettings();
		const layout = legacyLayout(includeAgent);
		const applicationTabs = findTab(layout.layout, "application-tabs");
		const editorTabset = findTab(
			layout.subLayouts!["code-workspace"]!.layout,
			"editor-tabset",
		);
		assert.ok(applicationTabs);
		assert.ok(editorTabset);
		applicationTabs.selected = 2;
		editorTabset.weight = 67;
		settings.setItem(
			"gic.workspaceLayout",
			JSON.stringify({ version: 8, layout }),
		);

		const loaded = loadWorkspace(includeAgent, settings, docs);
		const loadedDocs = loaded.getNodeById(DOCS_ID);
		assert.ok(loadedDocs instanceof TabNode);
		assert.equal(loadedDocs.getSubLayoutId(), "docs-workspace");
		assert.equal(loaded.getNodeById(AGENT_ID) instanceof TabNode, includeAgent);
		assert.equal(
			findTab(loaded.toJson().layout, "application-tabs")?.selected,
			2,
		);
		assert.equal(
			findTab(
				loaded.toJson().subLayouts!["code-workspace"]!.layout,
				"editor-tabset",
			)?.weight,
			67,
		);
		assert.equal(
			JSON.parse(settings.getItem("gic.workspaceLayout")!).version,
			11,
		);
	});
}

test("adds Sketches when migrating a desktop layout and omits it from the browser", () => {
	const settings = new MemorySettings();
	const layout = createDefaultWorkspace(false, docs).toJson();
	settings.setItem(
		"gic.workspaceLayout",
		JSON.stringify({ version: 10, layout }),
	);

	const desktop = loadWorkspace(true, settings, docs);
	assert.ok(desktop.getNodeById(SKETCHES_ID) instanceof TabNode);
	const browser = loadWorkspace(false, settings, docs);
	assert.equal(browser.getNodeById(SKETCHES_ID), undefined);
});

test("retains moved documents and Description in the feature layout across browser and desktop", () => {
	const settings = new MemorySettings();
	const model = createDefaultWorkspace(true, docs);
	model.doAction(
		Actions.moveNode(
			documentTabId("colors"),
			"editor-tabset",
			DockLocation.CENTER,
			-1,
		),
	);
	saveWorkspace(model, settings);
	const stored = settings.getItem("gic.workspaceLayout");
	assert.ok(stored);
	const saved = JSON.parse(stored);
	saved.version = 8;
	settings.setItem("gic.workspaceLayout", JSON.stringify(saved));

	const browser = loadWorkspace(false, settings, docs);
	assert.equal(browser.getNodeById(AGENT_ID), undefined);
	assert.ok(browser.getNodeById(DESCRIPTION_ID) instanceof TabNode);
	assert.equal(
		browser.getNodeById(documentTabId("colors"))?.getParent()?.getId(),
		"editor-tabset",
	);
	const desktop = loadWorkspace(true, settings, docs);
	assert.ok(desktop.getNodeById(AGENT_ID) instanceof TabNode);
	assert.ok(desktop.getNodeById(DESCRIPTION_ID) instanceof TabNode);
	assert.equal(
		desktop.getNodeById(documentTabId("colors"))?.getParent()?.getId(),
		"editor-tabset",
	);
});

test("retains the moved Description panel across workspace reload", () => {
	const settings = new MemorySettings();
	const model = createDefaultWorkspace(false, docs);
	model.doAction(
		Actions.moveNode(DESCRIPTION_ID, "output-tabset", DockLocation.CENTER, -1),
	);
	saveWorkspace(model, settings);

	const loaded = loadWorkspace(false, settings, docs);

	assert.equal(
		loaded.getNodeById(DESCRIPTION_ID)?.getParent()?.getId(),
		"output-tabset",
	);
});

test("adds documents to Docs and prunes removed documents without moving retained tabs", () => {
	const settings = new MemorySettings();
	const model = createDefaultWorkspace(true, docs);
	model.doAction(
		Actions.moveNode(
			documentTabId("colors"),
			"editor-tabset",
			DockLocation.CENTER,
			-1,
		),
	);
	saveWorkspace(model, settings);

	const loaded = loadWorkspace(true, settings, [
		{ id: "colors", title: "Colors" },
		{ id: "shapes", title: "Shapes" },
	]);
	assert.equal(
		loaded.getNodeById(documentTabId("colors"))?.getParent()?.getId(),
		"editor-tabset",
	);
	assert.equal(loaded.getNodeById(documentTabId("drawing")), undefined);
	assert.equal(
		loaded.getNodeById(documentTabId("shapes"))?.getParent()?.getId(),
		"documentation-tabset",
	);
});

test("resets malformed layouts with unknown documentation tabs", () => {
	const settings = new MemorySettings();
	const model = createDefaultWorkspace(true, docs);
	model.doAction(
		Actions.addTab(
			{
				id: "duplicate-colors",
				name: "Colors",
				component: DOC_COMPONENT,
			},
			"editor-tabset",
			DockLocation.CENTER,
			-1,
		),
	);
	saveWorkspace(model, settings);

	const loaded = loadWorkspace(true, settings, docs);
	assert.equal(
		loaded.getNodeById(documentTabId("colors"))?.getParent()?.getId(),
		"documentation-tabset",
	);
	assert.equal(documentTabs(loaded).length, 2);
});

test("resets malformed layouts with duplicate documentation tab ids", () => {
	const settings = new MemorySettings();
	saveWorkspace(createDefaultWorkspace(true, docs), settings);
	const stored = settings.getItem("gic.workspaceLayout");
	assert.ok(stored);
	const parsed = JSON.parse(stored);
	const codeLayout = parsed.layout.subLayouts["code-workspace"].layout;
	const docsLayout = parsed.layout.subLayouts["docs-workspace"].layout;
	const editorTabset = findTab(codeLayout, "editor-tabset");
	assert.ok(editorTabset);
	const duplicate = findTab(docsLayout, documentTabId("colors"));
	assert.ok(duplicate);
	(editorTabset.children as unknown[]).push(structuredClone(duplicate));
	settings.setItem("gic.workspaceLayout", JSON.stringify(parsed));

	const loaded = loadWorkspace(true, settings, docs);
	assert.equal(
		loaded.getNodeById(documentTabId("colors"))?.getParent()?.getId(),
		"documentation-tabset",
	);
});
