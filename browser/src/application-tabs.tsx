// ABOUTME: Renders the application-level navigation tabs and their panel content.
// ABOUTME: Provides keyboard-accessible selection while keeping every panel mounted.

import type { KeyboardEvent, ReactNode } from "react";

export type ApplicationTabId =
	| "code"
	| "settings"
	| "examples"
	| "docs"
	| "about";

interface ApplicationTab {
	id: ApplicationTabId;
	label: string;
}

interface ApplicationTabsProps {
	activeTab: ApplicationTabId;
	onSelect: (tab: ApplicationTabId) => void;
	panels: Record<ApplicationTabId, ReactNode>;
}

const tabs: readonly ApplicationTab[] = [
	{ id: "code", label: "Code" },
	{ id: "settings", label: "Settings" },
	{ id: "examples", label: "Examples" },
	{ id: "docs", label: "Docs" },
	{ id: "about", label: "About" },
];

function tabDomId(tab: ApplicationTabId): string {
	return `application-tab-${tab}`;
}

function panelDomId(tab: ApplicationTabId): string {
	return `application-panel-${tab}`;
}

export function ApplicationTabs({
	activeTab,
	onSelect,
	panels,
}: ApplicationTabsProps) {
	const selectAndFocus = (tab: ApplicationTabId) => {
		onSelect(tab);
		document.getElementById(tabDomId(tab))?.focus();
	};

	const handleKeyDown = (
		event: KeyboardEvent<HTMLButtonElement>,
		tab: ApplicationTabId,
	) => {
		const currentIndex = tabs.findIndex((item) => item.id === tab);
		let nextIndex: number | undefined;

		switch (event.key) {
			case "ArrowLeft":
				nextIndex = (currentIndex + tabs.length - 1) % tabs.length;
				break;
			case "ArrowRight":
				nextIndex = (currentIndex + 1) % tabs.length;
				break;
			case "Home":
				nextIndex = 0;
				break;
			case "End":
				nextIndex = tabs.length - 1;
				break;
			case "Enter":
			case " ":
				event.preventDefault();
				onSelect(tab);
				return;
			default:
				return;
		}

		event.preventDefault();
		selectAndFocus(tabs[nextIndex].id);
	};

	return (
		<section className="application-tabs">
			<div
				aria-label="Application"
				className="application-tabs__list"
				role="tablist"
			>
				{tabs.map((tab) => (
					<button
						aria-controls={panelDomId(tab.id)}
						aria-selected={activeTab === tab.id}
						id={tabDomId(tab.id)}
						key={tab.id}
						role="tab"
						tabIndex={activeTab === tab.id ? 0 : -1}
						type="button"
						onClick={() => onSelect(tab.id)}
						onKeyDown={(event) => handleKeyDown(event, tab.id)}
					>
						{tab.label}
					</button>
				))}
			</div>
			<div className="application-tabs__panels">
				{tabs.map((tab) => (
					<div
						aria-labelledby={tabDomId(tab.id)}
						className="application-tabs__panel"
						hidden={activeTab !== tab.id}
						id={panelDomId(tab.id)}
						key={tab.id}
						role="tabpanel"
					>
						{panels[tab.id]}
					</div>
				))}
			</div>
		</section>
	);
}
