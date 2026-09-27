// ABOUTME: Types and presentation rules for the desktop workspace support files.
// ABOUTME: Keeps status mapping pure so it can be verified without a Tauri host.

export type SupportFileState = "missing" | "upToDate" | "modified";

export interface SupportFileStatus {
	readonly path: string;
	readonly state: SupportFileState;
}

export interface WorkspaceStatus {
	readonly installed: boolean;
	readonly files: SupportFileStatus[];
}

export type AssistantName = "codex" | "opencode";

export interface AssistantStatus {
	readonly name: AssistantName;
	readonly available: boolean;
}

const FILE_TITLES: Record<string, string> = {
	"AGENTS.md": "AGENTS.md",
	".agents/skills/gic-tutor/SKILL.md": "Agent policy",
	".agents/skills/gic-tutor/references/language.md": "Language reference",
};

export function supportFileTitle(path: string): string {
	return FILE_TITLES[path] ?? path;
}

const STATE_LABELS: Record<SupportFileState, string> = {
	missing: "Missing",
	upToDate: "Up to date",
	modified: "Modified",
};

export function supportFileLabel(state: SupportFileState): string {
	return STATE_LABELS[state];
}

export interface AssistantPresentation {
	readonly title: string;
	readonly label: string;
	readonly guidance: string;
	readonly canLaunch: boolean;
}

export function assistantPresentation(
	name: AssistantName,
	available: boolean,
): AssistantPresentation {
	const title = name === "codex" ? "Codex" : "OpenCode";
	if (available) {
		return {
			title,
			label: `Launch ${title}`,
			guidance: "Opens a terminal in this workspace.",
			canLaunch: true,
		};
	}
	const guidance =
		name === "codex"
			? "Codex is not installed. Install the Codex CLI, then restart GiC."
			: "OpenCode is not installed. Install the OpenCode CLI, then restart GiC.";
	return {
		title,
		label: `Launch ${title}`,
		guidance,
		canLaunch: false,
	};
}
