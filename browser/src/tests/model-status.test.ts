// ABOUTME: Verifies the rendered desktop model picker explains discovery failures.
// ABOUTME: Keeps disconnected and empty-catalog states distinct for students.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import type { DesktopHost, OpencodeModel } from "../lib/desktop-host.ts";
import { agentModelLabel } from "../lib/model-preferences.ts";

const vite = await createServer({
	configFile: false,
	root: fileURLToPath(new URL("../../", import.meta.url)),
	optimizeDeps: { noDiscovery: true },
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
	enabledModelIds: readonly string[] = models.map((model) => model.id),
	desktopMode = true,
	goAuthenticated = false,
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
			desktop: desktopMode ? ({} as DesktopHost) : undefined,
			providerStatus: {
				opencodeAuthenticated: authenticated,
				openrouterAuthenticated,
				goAuthenticated,
			},
			models,
			enabledModelIds,
			selectedModel: models[0]?.id ?? "",
			modelError,
			onRetryModels: () => {},
			onModelChange: () => {},
			onModelVisibilityChange: () => {},
			onProviderAuthenticated: () => {},
		}),
	);
}

function modelRows(html: string): string[] {
	return [
		...html.matchAll(
			/<tr class="settings-model(?: settings-model-unverified)?">.*?<\/tr>/g,
		),
	].map(([row]) => row);
}

test("disconnected desktop does not claim the model catalog is empty", () => {
	const html = renderModels(false, null);
	assert.doesNotMatch(html, /No eligible models/);
	assert.doesNotMatch(html, /Retry models/);
});

test("browser-only Settings does not show empty provider sections", () => {
	const html = renderModels(false, null, [], false, [], false);
	assert.doesNotMatch(html, />Tutor<\/h2>/);
	assert.doesNotMatch(html, />OpenCode Zen<\/h3>/);
	assert.doesNotMatch(html, />Codex<\/h3>/);
	assert.doesNotMatch(html, />OpenRouter tutor<\/h3>/);
	assert.match(html, />Workspace<\/h2>/);
});

test("desktop provider headings are peers under Tutor", () => {
	const html = renderModels(false, null);
	const tutor = html.indexOf(">Tutor</h2>");
	const zen = html.indexOf(">OpenCode Zen</h3>");
	const go = html.indexOf(">OpenCode Go</h3>");
	const codex = html.indexOf(">Codex</h3>");
	const router = html.indexOf(">OpenRouter tutor</h3>");
	assert.ok(
		tutor >= 0 && tutor < zen && zen < go && go < codex && codex < router,
	);
});

test("Go models and its connection appear independently from Zen", () => {
	const html = renderModels(
		false,
		null,
		[
			{
				id: "opencode-go/kimi-k3",
				name: "Kimi K3",
				referenceToolsVerified: true,
			},
		],
		false,
		["opencode-go/kimi-k3"],
		true,
		true,
	);
	assert.match(html, /OpenCode Go with an API key/);
	assert.match(html, /Search OpenCode Go models/);
	assert.match(html, /OpenCode Go · Kimi K3/);
	assert.doesNotMatch(html, /API key saved; it has not been verified/);
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
				referenceToolsVerified: true,
				pricing: "$0.10/1M input tokens, $0.20/1M output tokens",
				accountLimit: "Account remaining $5 of $10",
			},
		],
		true,
	);
	assert.match(html, /third-party providers/);
	assert.match(html, /Agent model/);
	assert.ok(html.indexOf("Agent model") < html.indexOf("OpenCode Zen</h3>"));
	assert.match(html, /Choose a model/);
	assert.match(html, /0\.10\/1M input tokens/);
	assert.match(html, /0\.20\/1M output tokens/);
	assert.match(html, /Account remaining \$5 of \$10/);
	assert.match(
		html,
		/value="OpenRouter · Model[^"]*0\.10\/1M input tokens[^"]*0\.20\/1M output tokens"/,
	);
});

test("picker only offers enabled models while advanced switches include every model", () => {
	const html = renderModels(
		true,
		null,
		[
			{
				id: "opencode-zen/first",
				name: "First",
				referenceToolsVerified: true,
			},
			{
				id: "opencode-zen/second",
				name: "Second",
				referenceToolsVerified: true,
			},
		],
		false,
		["opencode-zen/second"],
	);
	assert.match(html, /Search tutor models/);
	assert.match(html, /Search OpenCode Zen models/);
	assert.match(html, /<svg[^>]*class="settings-collapse-indicator"/);
	assert.match(html, /Second/);
	assert.match(html, /First/);
	assert.match(html, /Enable First/);
	assert.match(html, /Enable Second/);
	assert.doesNotMatch(html, /<option/);
});

test("advanced provider tables list verified models first without reordering peers", () => {
	const html = renderModels(
		true,
		null,
		[
			{ id: "opencode-zen/first", name: "Zen unverified A" },
			{
				id: "opencode-zen/second",
				name: "Zen verified A",
				referenceToolsVerified: true,
			},
			{ id: "opencode-zen/third", name: "Zen unverified B" },
			{
				id: "opencode-zen/fourth",
				name: "Zen verified B",
				referenceToolsVerified: true,
			},
			{ id: "openrouter/author/first", name: "Router unverified" },
			{
				id: "openrouter/author/second",
				name: "Router verified",
				referenceToolsVerified: true,
			},
		],
		true,
		[],
	);
	assert.match(html, /<table[^>]*aria-label="OpenCode Zen models"/);
	assert.match(html, /<table[^>]*aria-label="OpenRouter models"/);
	assert.match(html, /<th scope="col">Model<\/th>/);
	assert.match(html, /<th scope="col">Reference tools<\/th>/);
	assert.match(html, /<th scope="col">Input price<\/th>/);
	assert.match(html, /<th scope="col">Output price<\/th>/);
	assert.match(html, /<th scope="col">Show in picker<\/th>/);
	const rows = modelRows(html);
	assert.deepEqual(
		rows.map((row) => row.match(/<th scope="row">([^<]+)/)?.[1]),
		[
			"Zen verified A",
			"Zen verified B",
			"Zen unverified A",
			"Zen unverified B",
			"Router verified",
			"Router unverified",
		],
	);
	assert.match(rows[0]!, /Enable Zen verified A/);
	assert.doesNotMatch(rows[0]!, /data-disabled/);
	assert.match(rows[2]!, /class="settings-model settings-model-unverified"/);
	assert.doesNotMatch(rows[2]!, /data-disabled/);
	assert.match(rows[4]!, /Enable Router verified/);
	assert.doesNotMatch(rows[4]!, /data-disabled/);
	assert.match(rows[5]!, /class="settings-model settings-model-unverified"/);
	assert.doesNotMatch(rows[5]!, /data-disabled/);
});

test("unverified models can be enabled and selected with a verification mark", () => {
	const html = renderModels(
		true,
		null,
		[
			{ id: "opencode-zen/big-pickle", name: "Big Pickle" },
			{
				id: "opencode-zen/gpt-6-luna",
				name: "GPT-6 Luna",
				referenceToolsVerified: true,
			},
		],
		false,
		["opencode-zen/big-pickle", "opencode-zen/gpt-6-luna"],
	);
	const bigPickle = modelRows(html).find((row) => row.includes("Big Pickle"));
	assert.ok(bigPickle);
	assert.match(bigPickle, /class="settings-model settings-model-unverified"/);
	assert.doesNotMatch(bigPickle, /data-disabled/);
	assert.match(bigPickle, />Not verified<\/td>/);
	assert.match(html, /value="OpenCode Zen · Big Pickle/);
});

test("an unverified-only catalog still offers enabled models", () => {
	const html = renderModels(
		true,
		null,
		[{ id: "opencode-zen/big-pickle", name: "Big Pickle" }],
		false,
		["opencode-zen/big-pickle"],
	);
	assert.doesNotMatch(html, /No models verified for reference tools yet/);
	assert.match(html, /Search tutor models/);
	assert.match(html, /value="OpenCode Zen · Big Pickle/);
});

test("no enabled models has an explicit instruction without calling discovery empty", () => {
	const html = renderModels(
		true,
		null,
		[
			{
				id: "opencode-zen/first",
				name: "First",
				referenceToolsVerified: true,
			},
		],
		false,
		[],
	);
	assert.match(html, /No models enabled/);
	assert.doesNotMatch(html, /No eligible models/);
});

test("free and paid OpenRouter prices are distinguished in advanced rows", () => {
	const html = renderModels(
		false,
		null,
		[
			{
				id: "openrouter/author/free",
				name: "Free tutor",
				pricing: "$0.00/1M input tokens, $0.00/1M output tokens",
				isFree: true,
			},
			{
				id: "openrouter/author/paid",
				name: "Paid tutor",
				pricing: "$0.10/1M input tokens, $0.20/1M output tokens",
				isFree: false,
			},
			{
				id: "openrouter/author/tiny",
				name: "Low-cost tutor",
				pricing: "$0.00/1M input tokens, $0.00/1M output tokens",
				isFree: false,
			},
			{
				id: "openrouter/author/request",
				name: "Request-priced tutor",
				pricing: "$0.00/1M input tokens, $0.00/1M output tokens",
				isFree: false,
				otherCharges: true,
			},
		],
		true,
		[],
	);
	assert.match(html, /Free tutor/);
	assert.match(html, /<strong class="settings-model-detail">Free<\/strong>/);
	assert.match(html, /<td>\$0\.10\/1M input tokens<\/td>/);
	assert.match(html, /<td>\$0\.20\/1M output tokens<\/td>/);
	const lowCostRow = modelRows(html).find((row) =>
		row.includes("Low-cost tutor"),
	);
	assert.ok(lowCostRow);
	assert.doesNotMatch(lowCostRow, /<strong[^>]*>Free<\/strong>/);
	const requestRow = modelRows(html).find((row) =>
		row.includes("Request-priced tutor"),
	);
	assert.ok(requestRow);
	assert.match(requestRow, /Additional charges may apply/);
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
	assert.match(
		html.slice(routerSection, keyInput),
		/two additional model requests/,
	);
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

test("Agent panel explains a missing model and marks the composer disabled", () => {
	const html = renderToStaticMarkup(
		createElement(AgentPanel, {
			actions: {
				cancel: () => {},
				retry: () => {},
				submit: () => {},
				startNewSession: async () => {},
			},
			allowCopying: false,
			disabled: true,
			disabledReason: "No Agent model selected. Choose one in Settings.",
			messages: [],
			status: "ready",
		}),
	);
	assert.match(html, /No Agent model selected\. Choose one in Settings\./);
	assert.doesNotMatch(html, /Save this sketch before using the Agent/);
	assert.match(html, /class="agent-composer agent-composer-disabled"/);
	assert.match(html, /<textarea[^>]*disabled/);
	assert.match(html, /aria-describedby="agent-disabled-reason"/);
	assert.match(
		html,
		/<button(?=[^>]*aria-label="Send message")(?=[^>]*disabled)[^>]*>/,
	);
});

test("Agent panel shows the selected provider and model without disabling input", () => {
	const html = renderToStaticMarkup(
		createElement(AgentPanel, {
			actions: {
				cancel: () => {},
				retry: () => {},
				submit: () => {},
				startNewSession: async () => {},
			},
			allowCopying: false,
			modelLabel: "OpenRouter · GLM-5.3",
			messages: [],
			status: "ready",
		}),
	);
	assert.match(html, /Model: OpenRouter · GLM-5\.3/);
	assert.doesNotMatch(html, /agent-composer-disabled/);
	assert.doesNotMatch(html, /<textarea[^>]*disabled/);
});

test("Agent header marks an unverified selected model without disabling input", () => {
	const html = renderToStaticMarkup(
		createElement(AgentPanel, {
			actions: {
				cancel: () => {},
				retry: () => {},
				submit: () => {},
				startNewSession: async () => {},
			},
			allowCopying: false,
			modelLabel: agentModelLabel({
				id: "openrouter/author/experimental",
				name: "Experimental",
			}),
			messages: [],
			status: "ready",
		}),
	);
	assert.match(html, /Model: OpenRouter · Experimental · Not verified/);
	assert.doesNotMatch(html, /agent-composer-disabled/);
});
