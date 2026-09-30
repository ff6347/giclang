// ABOUTME: Adapts native document dialogs, saves, and menu events for the shared IDE.
// ABOUTME: Keeps filesystem paths and native menu implementation outside the webview.

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { WindowTheme } from "./theme.ts";
import type { AssistantStatus, WorkspaceStatus } from "./workspace-support.ts";

export interface ProviderCredentialStatus {
	readonly codexAuthenticated: boolean;
	readonly goAuthenticated: boolean;
	readonly opencodeAuthenticated: boolean;
	readonly openrouterAuthenticated: boolean;
}

export type CodexAuthEvent =
	| {
			readonly kind: "deviceAuthorization";
			readonly attemptId: number;
			readonly url: string;
			readonly userCode: string;
	  }
	| { readonly kind: "complete"; readonly attemptId: number }
	| { readonly kind: "cancelled"; readonly attemptId: number }
	| {
			readonly kind: "error";
			readonly attemptId: number;
			readonly message: string;
	  };

export interface OpencodeModel {
	readonly id: string;
	readonly name: string;
	readonly referenceToolsVerified?: boolean;
	readonly beginnerDefault?: boolean;
	readonly pricing?: string;
	readonly isFree?: boolean;
	readonly otherCharges?: boolean;
	readonly accountLimit?: string;
}

export type OpencodeAgentEvent =
	| { readonly requestId: string; readonly kind: "text"; readonly text: string }
	| { readonly requestId: string; readonly kind: "complete" }
	| { readonly requestId: string; readonly kind: "cancelled" }
	| {
			readonly requestId: string;
			readonly kind: "error";
			readonly message: string;
	  };

const MENU_ACTION_EVENT = "desktop-menu-action";

export interface DesktopDocument {
	readonly documentId: string;
	readonly name: string;
	readonly sketchId: string;
	readonly source: string;
	readonly description: string | null;
}

export interface DesktopSketchCandidate {
	readonly entryId: string;
	readonly description: string;
	readonly thumbnailDataUrl: string | null;
}

export type AgentSessionRecord =
	| {
			readonly type: "session";
			readonly id: string;
			readonly name: string;
			readonly startedAt: string;
	  }
	| {
			readonly type: "message";
			readonly sessionId: string;
			readonly role: "student" | "agent";
			readonly text: string;
			readonly at: string;
	  };

export interface AgentSessionSummary {
	readonly sessionId: string;
	readonly name: string;
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

	discoverSketches(): Promise<DesktopSketchCandidate[]> {
		return invoke<DesktopSketchCandidate[]>("discover_sketches");
	}

	openGallerySketch(entryId: string): Promise<DesktopDocument> {
		return invoke<DesktopDocument>("open_gallery_sketch", { entryId });
	}

	acceptOpenDocument(documentId: string): Promise<void> {
		return invoke<void>("accept_open_gic", { documentId });
	}

	cancelOpenDocument(documentId: string): Promise<void> {
		return invoke<void>("cancel_open_gic", { documentId });
	}

	createAgentSession(name: string, documentId: string): Promise<string> {
		return invoke<string>("create_agent_session", { name, documentId });
	}

	newAgentSession(documentId: string, name: string): Promise<string> {
		return this.createAgentSession(name, documentId);
	}

	cloneAgentSession(documentId: string): Promise<string | null> {
		return invoke<string | null>("clone_agent_session", { documentId });
	}

	appendAgentMessage(
		documentId: string,
		sessionId: string,
		role: "student" | "agent",
		text: string,
	): Promise<void> {
		return invoke<void>("append_agent_message", {
			documentId,
			sessionId,
			role,
			text,
		});
	}

	readAgentSession(
		documentId: string,
		sessionId: string,
	): Promise<AgentSessionRecord[]> {
		return invoke<AgentSessionRecord[]>("read_agent_session", {
			documentId,
			sessionId,
		});
	}

	findAgentSession(documentId: string): Promise<AgentSessionSummary | null> {
		return invoke<AgentSessionSummary | null>("find_agent_session", {
			documentId,
		});
	}

	revealSketchFolder(): Promise<void> {
		return invoke<void>("reveal_sketch_folder");
	}

	saveDocument(
		documentId: string,
		source: string,
		description: string | null,
		thumbnail: string | undefined,
	): Promise<void> {
		return invoke<void>("save_gic", {
			documentId,
			document: { source, description, thumbnail: thumbnail ?? null },
		});
	}

	saveDocumentAs(
		source: string,
		suggestedName: string,
		description: string | null,
		thumbnail: string | undefined,
	): Promise<DesktopDocument | null> {
		return invoke<DesktopDocument | null>("save_gic_as", {
			document: { source, description, thumbnail: thumbnail ?? null },
			suggestedName,
		});
	}

	saveExport(format: "png" | "html", contents: Uint8Array): Promise<boolean> {
		const command = format === "png" ? "save_png_export" : "save_html_export";
		return invoke<boolean>(command, contents);
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

	providerCredentialStatus(): Promise<ProviderCredentialStatus> {
		return invoke<ProviderCredentialStatus>("provider_credential_status");
	}

	startCodexLogin(): Promise<void> {
		return invoke<void>("start_codex_login");
	}

	openCodexVerification(): Promise<void> {
		return invoke<void>("open_codex_verification");
	}

	cancelCodexLogin(): Promise<void> {
		return invoke<void>("cancel_codex_login");
	}

	signOutCodex(): Promise<ProviderCredentialStatus> {
		return invoke<ProviderCredentialStatus>("sign_out_codex");
	}

	onCodexAuthEvent(
		handler: (event: CodexAuthEvent) => void,
	): Promise<UnlistenFn> {
		return listen<CodexAuthEvent>("codex-auth-event", (event) => {
			handler(event.payload);
		});
	}

	authenticateOpencode(apiKey: string): Promise<ProviderCredentialStatus> {
		return invoke<ProviderCredentialStatus>("authenticate_opencode", {
			apiKey,
		});
	}

	authenticateGo(apiKey: string): Promise<ProviderCredentialStatus> {
		return invoke<ProviderCredentialStatus>("authenticate_go", { apiKey });
	}

	authenticateOpenrouter(apiKey: string): Promise<ProviderCredentialStatus> {
		return invoke<ProviderCredentialStatus>("authenticate_openrouter", {
			apiKey,
		});
	}

	signOutOpencode(): Promise<ProviderCredentialStatus> {
		return invoke<ProviderCredentialStatus>("sign_out_opencode");
	}

	signOutGo(): Promise<ProviderCredentialStatus> {
		return invoke<ProviderCredentialStatus>("sign_out_go");
	}

	signOutOpenrouter(): Promise<ProviderCredentialStatus> {
		return invoke<ProviderCredentialStatus>("sign_out_openrouter");
	}

	opencodeModels(): Promise<OpencodeModel[]> {
		return invoke<OpencodeModel[]>("opencode_models");
	}

	goModels(): Promise<OpencodeModel[]> {
		return invoke<OpencodeModel[]>("go_models");
	}

	codexModels(): Promise<OpencodeModel[]> {
		return invoke<OpencodeModel[]>("codex_models");
	}

	openrouterModels(): Promise<OpencodeModel[]> {
		return invoke<OpencodeModel[]>("openrouter_models");
	}

	sendOpencodeRequest(request: {
		readonly requestId: string;
		readonly question: string;
		readonly context: string;
		readonly examples: readonly {
			readonly id: string;
			readonly title: string;
			readonly categories: readonly string[];
			readonly tags: readonly string[];
			readonly description: string;
			readonly source: string;
		}[];
		readonly model: string;
		readonly sessionId?: string;
	}): Promise<void> {
		return invoke<void>("send_opencode_request", {
			requestId: request.requestId,
			model: request.model,
			input: {
				question: request.question,
				context: request.context,
				examples: request.examples,
				sessionId: request.sessionId,
			},
		});
	}

	cancelOpencodeRequest(requestId: string): Promise<void> {
		return invoke<void>("cancel_opencode_request", { requestId });
	}

	onOpencodeAgentEvent(
		handler: (event: OpencodeAgentEvent) => void,
	): Promise<UnlistenFn> {
		return listen<OpencodeAgentEvent>("opencode-agent-event", (event) => {
			handler(event.payload);
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
