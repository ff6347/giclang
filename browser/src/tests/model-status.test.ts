// ABOUTME: Verifies the rendered desktop model picker explains discovery failures.
// ABOUTME: Keeps disconnected and empty-catalog states distinct for students.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import type { DesktopHost, OpencodeModel } from "../lib/desktop-host.ts";

const vite = await createServer({
	configFile: false,
	root: fileURLToPath(new URL("../../", import.meta.url)),
	server: { middlewareMode: true },
	appType: "custom",
});
after(() => vite.close());
const { SettingsPanel } = await vite.ssrLoadModule(
	"/src/components/settings-panel.tsx",
);

function renderModels(
	authenticated: boolean,
	modelError: string | null,
	models: readonly OpencodeModel[] = [],
): string {
	return renderToStaticMarkup(
		createElement(SettingsPanel, {
			agentResponseCopying: false,
			appearance: "system",
			canvasFrame: true,
			darkTheme: "vs-dark",
			formatOnSave: false,
			lightTheme: "vs-light",
			onAgentResponseCopyingChange: () => {},
			onAppearanceChange: () => {},
			onCanvasFrameChange: () => {},
			onDarkThemeChange: () => {},
			onFormatOnSaveChange: () => {},
			onLightThemeChange: () => {},
			onResetLayout: () => {},
			workspace: undefined,
			desktop: {} as DesktopHost,
			providerStatus: { opencodeAuthenticated: authenticated },
			models,
			selectedModel: models[0]?.id ?? "",
			modelError,
			onRetryModels: () => {},
			onModelChange: () => {},
			onProviderAuthenticated: () => {},
		}),
	);
}

test("disconnected desktop does not claim the model catalog is empty", () => {
	const html = renderModels(false, null);
	assert.doesNotMatch(html, /No eligible OpenCode Zen models/);
	assert.doesNotMatch(html, /Retry models/);
});

test("model discovery failure is visible and can be retried", () => {
	const html = renderModels(true, "OpenCode rejected this API key (HTTP 401).");
	assert.match(html, /role="alert"/);
	assert.match(html, /HTTP 401/);
	assert.match(html, /Retry models/);
});

test("an empty supported catalog is distinct from a discovery failure", () => {
	const html = renderModels(true, null);
	assert.match(html, /No eligible OpenCode Zen models/);
	assert.match(html, /Retry models/);
	assert.doesNotMatch(html, /role="alert"/);
});
