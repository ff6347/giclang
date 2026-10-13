// ABOUTME: Verifies server configuration and locally served assets at the HTTP boundary.
// ABOUTME: Checks fail-closed startup without exposing supplied secrets or participant data.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadConfig } from "../config.ts";
import { config, fixture } from "./fixture.ts";

const environment = {
	PARTICIPANT_PASSWORD: config.participantPassword,
	ADMIN_SECRET: config.adminSecret,
	COOKIE_SECRET: config.cookieSecret,
	DB_PATH: ":memory:",
};

test("requires separate secrets and validates closed-by-default server configuration", () => {
	const loaded = loadConfig(environment);
	assert.equal(loaded.formOpen, false);
	assert.equal(loaded.port, 3000);
	assert.equal(loaded.host, "0.0.0.0");
	assert.equal(loaded.dbPath, ":memory:");
	assert.equal(
		loadConfig({ ...environment, FORM_OPEN: "true" }).formOpen,
		true,
	);
	for (const key of [
		"PARTICIPANT_PASSWORD",
		"ADMIN_SECRET",
		"COOKIE_SECRET",
		"DB_PATH",
	]) {
		assert.throws(
			() => loadConfig({ ...environment, [key]: "" }),
			new RegExp(key),
		);
	}
	assert.throws(
		() =>
			loadConfig({ ...environment, ADMIN_SECRET: config.participantPassword }),
		/different/,
	);
	assert.throws(
		() => loadConfig({ ...environment, COOKIE_SECRET: "short" }),
		/32/,
	);
	assert.throws(
		() => loadConfig({ ...environment, FORM_OPEN: "yes" }),
		/FORM_OPEN/,
	);
	assert.throws(() => loadConfig({ ...environment, PORT: "NaN" }), /PORT/);
});

test("serves package-owned tokens and fonts without exposing arbitrary files", async (t) => {
	const { app } = await fixture(t);
	const assets = [
		[
			"/assets/tokens.css",
			new URL("../../../../packages/styles/tokens.css", import.meta.url),
			"text/css",
		],
		[
			"/assets/fonts/IBMPlexMono-Regular.ttf",
			new URL(
				"../../../../packages/styles/fonts/IBMPlexMono-Regular.ttf",
				import.meta.url,
			),
			"font/ttf",
		],
		[
			"/assets/feedback.css",
			new URL("../../public/feedback.css", import.meta.url),
			"text/css",
		],
		[
			"/assets/form.js",
			new URL("../../public/form.js", import.meta.url),
			"text/javascript",
		],
	] as const;
	for (const [route, path, contentType] of assets) {
		const response = await app.request(route);
		assert.equal(response.status, 200, route);
		assert.ok(
			response.headers.get("content-type")?.startsWith(contentType),
			route,
		);
		assert.deepEqual(
			Buffer.from(await response.arrayBuffer()),
			readFileSync(path),
		);
	}
	for (const route of [
		"/assets/package.json",
		"/assets/fonts/unknown.ttf",
		"/assets/%2e%2e%2fpackage.json",
		"/src/app.ts",
	]) {
		assert.equal((await app.request(route)).status, 404, route);
	}
});

test("entry point rejects missing secrets with a safe startup error", async () => {
	const child = spawn(
		process.execPath,
		[new URL("../main.ts", import.meta.url).pathname],
		{
			env: { ...process.env, ...environment, COOKIE_SECRET: "" },
			stdio: ["ignore", "pipe", "pipe"],
		},
	);
	let stdout = "";
	let stderr = "";
	child.stdout.on("data", (chunk) => {
		stdout += chunk;
	});
	child.stderr.on("data", (chunk) => {
		stderr += chunk;
	});
	const [code] = await once(child, "close");
	assert.equal(code, 1);
	assert.equal(stdout, "");
	assert.equal(
		stderr,
		"Feedback server could not start. Check configuration and database access.\n",
	);
});
