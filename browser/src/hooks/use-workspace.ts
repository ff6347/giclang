// ABOUTME: Loads and mutates desktop workspace support state for the Settings panel.
// ABOUTME: Keeps the native bridge calls out of the shared Settings component.

import { useCallback, useEffect, useState } from "react";
import type { DesktopHost } from "../lib/desktop-host.ts";
import type {
	AssistantStatus,
	WorkspaceStatus,
} from "../lib/workspace-support.ts";

export interface WorkspaceController {
	readonly assistants: AssistantStatus[];
	readonly status: WorkspaceStatus | null;
	launch(assistant: string): void;
	repair(): void;
	resolve(path: string, resolution: "keep" | "replace"): void;
	uninstall(): void;
}

function errorMessage(reason: unknown): string {
	if (typeof reason === "string") {
		return reason;
	}
	if (reason instanceof Error) {
		return reason.message;
	}
	return "The desktop request failed.";
}

export function useWorkspace(
	desktop: DesktopHost | undefined,
): WorkspaceController {
	const [status, setStatus] = useState<WorkspaceStatus | null>(null);
	const [assistants, setAssistants] = useState<AssistantStatus[]>([]);

	const refresh = useCallback(() => {
		if (desktop === undefined) {
			return;
		}
		void desktop
			.workspaceStatus()
			.then(setStatus)
			.catch((reason: unknown) => {
				window.alert(errorMessage(reason));
			});
		void desktop
			.assistantStatus()
			.then(setAssistants)
			.catch((reason: unknown) => {
				window.alert(errorMessage(reason));
			});
	}, [desktop]);

	useEffect(() => {
		if (desktop === undefined) {
			return;
		}
		refresh();
	}, [desktop, refresh]);

	const applyStatus = (request: Promise<WorkspaceStatus>): void => {
		void request.then(setStatus).catch((reason: unknown) => {
			window.alert(errorMessage(reason));
		});
	};

	const repair = (): void => {
		if (desktop !== undefined) {
			applyStatus(desktop.repairWorkspace());
		}
	};

	const uninstall = (): void => {
		if (desktop !== undefined) {
			applyStatus(desktop.uninstallWorkspace());
		}
	};

	const resolve = (path: string, resolution: "keep" | "replace"): void => {
		if (desktop !== undefined) {
			applyStatus(desktop.resolveWorkspaceFile(path, resolution));
		}
	};

	const launch = (assistant: string): void => {
		if (desktop !== undefined) {
			void desktop.launchAssistant(assistant).catch((reason: unknown) => {
				window.alert(errorMessage(reason));
			});
		}
	};

	return { assistants, status, launch, repair, resolve, uninstall };
}
