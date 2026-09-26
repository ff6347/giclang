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
const { AgentPanel } = await vite.ssrLoadModule(
	"/src/components/agent-panel.tsx",
);

function renderModels(
	authenticated: boolean,
	modelError: string | null,
	models: readonly OpencodeModel[] = [],
	openrouterAuthenticated = false,
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
			providerStatus: {
				opencodeAuthenticated: authenticated,
				openrouterAuthenticated,
			},
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
	assert.doesNotMatch(html, /No eligible models/);
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
	assert.match(html, /No eligible models/);
	assert.match(html, /Retry models/);
	assert.doesNotMatch(html, /role="alert"/);
});

test("OpenRouter models show pricing before the student chooses one", () => {
	const html = renderModels(
		false,
		null,
		[
			{
				id: "openrouter/author/model",
				name: "Model",
				pricing: "$0.10/1M input tokens",
				accountLimit: "Account remaining $5 of $10",
			},
		],
		true,
	);
	assert.match(html, /third-party providers/);
	assert.match(html, /Tutor model/);
	assert.match(html, /Choose a model/);
	assert.match(html, /0\.10\/1M input tokens/);
	assert.match(html, /Account remaining \$5 of \$10/);
});

test("OpenRouter disclosure appears before the key is entered in Settings", () => {
	const html = renderModels(false, null);
	const routerSection = html.indexOf("OpenRouter tutor");
	const disclosure = html.indexOf("third-party providers", routerSection);
	const keyInput = html.indexOf(
		'aria-label="OpenRouter API key"',
		routerSection,
	);
	assert.ok(routerSection >= 0);
	assert.ok(disclosure > routerSection);
	assert.ok(keyInput > disclosure);
	assert.match(html, /retention terms/);
});

test("OpenRouter questions do not require an in-app terms checkbox", () => {
	const html = renderToStaticMarkup(
		createElement(AgentPanel, {
			actions: {
				cancel: () => {},
				retry: () => {},
				submit: () => {},
				startNewSession: async () => {},
			},
			allowCopying: false,
			messages: [],
			status: "ready",
		}),
	);
	assert.doesNotMatch(html, /I confirm I am 18 or older/);
	assert.doesNotMatch(html, /type="checkbox"/);
	assert.doesNotMatch(
		html,
		/<button[^>]*disabled[^>]*aria-label="Send message"/,
	);
});
