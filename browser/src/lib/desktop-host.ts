// ABOUTME: Adapts native document dialogs, saves, and menu events for the shared IDE.
// ABOUTME: Keeps filesystem paths and native menu implementation outside the webview.

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { WindowTheme } from "./theme.ts";

const MENU_ACTION_EVENT = "desktop-menu-action";

export interface DesktopDocument {
	readonly documentId: string;
	readonly name: string;
	readonly source: string;
}

export type DesktopMenuAction =
	| "format"
	| "open"
	| "redo"
	| "save"
	| "saveAs"
	| "settings"
	| "undo";

function isDesktopMenuAction(value: unknown): value is DesktopMenuAction {
	return (
		value === "open" ||
		value === "redo" ||
		value === "save" ||
		value === "saveAs" ||
		value === "settings" ||
		value === "format" ||
		value === "undo"
	);
}

export class DesktopHost {
	openDocument(): Promise<DesktopDocument | null> {
		return invoke<DesktopDocument | null>("open_gic");
	}

	saveDocument(documentId: string, source: string): Promise<void> {
		return invoke<void>("save_gic", { documentId, source });
	}

	saveDocumentAs(
		source: string,
		suggestedName: string,
	): Promise<DesktopDocument | null> {
		return invoke<DesktopDocument | null>("save_gic_as", {
			source,
			suggestedName,
		});
	}

	setWindowTheme(theme: WindowTheme | null): Promise<void> {
		return getCurrentWindow().setTheme(theme);
	}

	onMenuAction(
		handler: (action: DesktopMenuAction) => void,
	): Promise<UnlistenFn> {
		return listen<unknown>(MENU_ACTION_EVENT, (event) => {
			if (isDesktopMenuAction(event.payload)) handler(event.payload);
		});
	}
}
