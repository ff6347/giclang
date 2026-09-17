// ABOUTME: Defines the FlexLayout model for top-level application navigation.
// ABOUTME: Keeps every application tab mounted while the selected tab changes.

import { Model, type IJsonModel } from "flexlayout-react";

export const CODE_ID = "code";
export const SETTINGS_ID = "settings";
export const EXAMPLES_ID = "examples";
export const DOCS_ID = "docs";
export const ABOUT_ID = "about";

const applicationLayout: IJsonModel = {
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
				id: "application-tabs",
				selected: 0,
				children: [
					{
						type: "tab",
						id: CODE_ID,
						name: "Code",
						component: CODE_ID,
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

export function createApplicationModel(): Model {
	return Model.fromJson(applicationLayout);
}
