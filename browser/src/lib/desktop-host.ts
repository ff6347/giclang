// ABOUTME: Adapts native document dialogs, saves, and menu events for the shared IDE.
// ABOUTME: Keeps filesystem paths and native menu implementation outside the webview.

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { WindowTheme } from "./theme.ts";
import type { AssistantStatus, WorkspaceStatus } from "./workspace-support.ts";

const MENU_ACTION_EVENT = "desktop-menu-action";

export interface DesktopDocument {
	readonly documentId: string;
	readonly name: string;
	readonly sketchId: string;
	readonly source: string;
}

export type AgentSessionRecord =
	| {
			readonly type: "session";
			readonly id: string;
			readonly name: string;
			readonly startedAt: string;
			readonly sketchId: string;
	  }
	| {
			readonly type: "message";
			readonly sessionId: string;
			readonly role: "student" | "agent";
			readonly text: string;
			readonly at: string;
	  }
	| {
			readonly type: "compaction";
			readonly sessionId: string;
			readonly at: string;
			readonly messageCount: number;
	  }
	| {
			readonly type: "relationship";
			readonly sessionId: string;
			readonly at: string;
			readonly sketchId: string;
			readonly sketchName: string;
	  };

export interface AgentSessionSummary {
	readonly sessionId: string;
	readonly name: string;
	readonly sketchId: string;
}

export type DesktopMenuAction =
	| "format"
	| "new"
	| "open"
	| "redo"
	| "reveal"
	| "save"
	| "saveAs"
	| "settings"
	| "undo";

function isDesktopMenuAction(value: unknown): value is DesktopMenuAction {
	return (
		value === "format" ||
		value === "new" ||
		value === "open" ||
		value === "redo" ||
		value === "reveal" ||
		value === "save" ||
		value === "saveAs" ||
		value === "settings" ||
		value === "undo"
	);
}

export class DesktopHost {
	openDocument(): Promise<DesktopDocument | null> {
		return invoke<DesktopDocument | null>("open_gic");
	}

	createAgentSession(name: string, sketchId: string): Promise<string> {
		return invoke<string>("create_agent_session", { name, sketchId });
	}

	cloneAgentSession(
		sessionId: string,
		name: string,
		sketchId: string,
	): Promise<string> {
		return invoke<string>("clone_agent_session", { sessionId, name, sketchId });
	}

	appendAgentMessage(
		sessionId: string,
		role: "student" | "agent",
		text: string,
	): Promise<void> {
		return invoke<void>("append_agent_message", { sessionId, role, text });
	}

	compactAgentSession(sessionId: string): Promise<number> {
		return invoke<number>("compact_agent_session", { sessionId });
	}

	updateAgentRelationship(
		sessionId: string,
		sketchId: string,
		sketchName: string,
	): Promise<void> {
		return invoke<void>("update_agent_relationship", {
			sessionId,
			sketchId,
			sketchName,
		});
	}

	readAgentSession(sessionId: string): Promise<AgentSessionRecord[]> {
		return invoke<AgentSessionRecord[]>("read_agent_session", { sessionId });
	}

	findAgentSession(sketchId: string): Promise<AgentSessionSummary | null> {
		return invoke<AgentSessionSummary | null>("find_agent_session", {
			sketchId,
		});
	}

	revealSketchFolder(): Promise<void> {
		return invoke<void>("reveal_sketch_folder");
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

	workspaceStatus(): Promise<WorkspaceStatus> {
		return invoke<WorkspaceStatus>("workspace_status");
	}

	projectsDirectory(): Promise<string> {
		return invoke<string>("projects_directory");
	}

	existingSketchNames(): Promise<string[]> {
		return invoke<string[]>("existing_sketch_names");
	}

	chooseProjectsDirectory(): Promise<string | null> {
		return invoke<string | null>("choose_projects_directory");
	}

	showWorkspaceNotice(): Promise<void> {
		return invoke<void>("show_workspace_notice");
	}

	repairWorkspace(): Promise<WorkspaceStatus> {
		return invoke<WorkspaceStatus>("repair_workspace");
	}

	uninstallWorkspace(): Promise<WorkspaceStatus> {
		return invoke<WorkspaceStatus>("uninstall_workspace");
	}

	resolveWorkspaceFile(
		path: string,
		resolution: "keep" | "replace",
	): Promise<WorkspaceStatus> {
		return invoke<WorkspaceStatus>("resolve_workspace_file", {
			path,
			resolution,
		});
	}

	assistantStatus(): Promise<AssistantStatus[]> {
		return invoke<AssistantStatus[]>("assistant_status");
	}

	launchAssistant(name: string): Promise<void> {
		return invoke<void>("launch_assistant", { name });
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
