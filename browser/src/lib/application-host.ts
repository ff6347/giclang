// ABOUTME: Selects browser or desktop services before the shared IDE mounts.
// ABOUTME: Keeps Tauri commands behind a settings-only host boundary.

import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ApplicationSettings } from "./application-settings.ts";
import { DesktopSettings } from "./desktop-settings.ts";

export interface ApplicationHost {
	readonly settings: ApplicationSettings;
	readonly supportsAppUpdates: boolean;
}

export async function createApplicationHost(): Promise<ApplicationHost> {
	if (!isTauri()) {
		return {
			settings: localStorage,
			supportsAppUpdates: true,
		};
	}
	const settings = await invoke<Record<string, string>>("read_settings");
	const desktopSettings = new DesktopSettings(settings, (key, value) =>
		invoke<void>("write_setting", { key, value }),
	);
	const currentWindow = getCurrentWindow();
	await currentWindow.onCloseRequested(async (event) => {
		event.preventDefault();
		try {
			await desktopSettings.flush();
			await currentWindow.destroy();
		} catch {
			window.alert(
				"GIC could not save its settings. The window will remain open so you can try again.",
			);
		}
	});
	return {
		settings: desktopSettings,
		supportsAppUpdates: false,
	};
}
