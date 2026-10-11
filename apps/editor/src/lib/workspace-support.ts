// ABOUTME: Types and presentation rules for the desktop workspace support files.
// ABOUTME: Keeps status mapping pure so it can be verified without a Tauri host.

export type SupportFileState = "missing" | "upToDate" | "modified";

export interface SupportFileStatus {
	readonly path: string;
	readonly resolvedPath: string;
	readonly state: SupportFileState;
}

export interface WorkspaceStatus {
	readonly installed: boolean;
	readonly directory: string;
	readonly files: SupportFileStatus[];
}

export type AssistantName = "codex" | "opencode";

export interface AssistantStatus {
	readonly name: AssistantName;
	readonly available: boolean;
}

const FILE_TITLES: Record<string, string> = {
	"AGENTS.md": "AGENTS.md",
	".agents/skills/gic-agent/SKILL.md": "Skill",
	".agents/skills/gic-agent/references/language.md": "Language reference",
};

export function supportFileTitle(path: string): string {
	return FILE_TITLES[path] ?? path;
}

const STATE_LABELS: Record<SupportFileState, string> = {
	missing: "Missing",
	upToDate: "Up to date",
	modified: "Modified",
};

export function supportFileLabel(
	state: SupportFileState,
	installed = true,
): string {
	if (!installed && state === "missing") return "Not installed";
	return STATE_LABELS[state];
}

export function supportFilePresentation(
	file: SupportFileStatus,
	installed: boolean,
): { destination: string; state: string } {
	return {
		destination: file.resolvedPath,
		state: supportFileLabel(file.state, installed),
	};
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
