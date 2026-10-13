// ABOUTME: Starts a real feedback HTTP server backed by a temporary SQLite database.
// ABOUTME: Provides isolated participant credentials and deterministic resource cleanup.

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestContext } from "node:test";
import { serve } from "@hono/node-server";
import { createApp } from "../app.ts";
import { openStore } from "../store.ts";

export const config = {
	participantPassword: randomBytes(20).toString("hex"),
	adminSecret: randomBytes(32).toString("hex"),
	cookieSecret: randomBytes(32).toString("hex"),
	formOpen: true,
};

export async function fixture(t: TestContext) {
	const directory = mkdtempSync(join(tmpdir(), "gic-feedback-"));
	const path = join(directory, "feedback.sqlite");
	const store = openStore(path);
	const server = serve({
		fetch: createApp(config, store).fetch,
		hostname: "127.0.0.1",
		port: 0,
	});
	await new Promise<void>((resolve) => server.once("listening", resolve));
	const address = server.address();
	assert.ok(address && typeof address === "object");
	const url = `http://127.0.0.1:${address.port}`;
	t.after(async () => {
		await new Promise<void>((resolve, reject) =>
			server.close((error) => (error ? reject(error) : resolve())),
		);
		store.close();
		rmSync(directory, { recursive: true });
	});
	const app = {
		request(route: string, init: RequestInit = {}) {
			const headers = new Headers(init.headers);
			if (init.method === "POST" && !headers.has("origin"))
				headers.set("origin", url);
			return fetch(new URL(route, url), {
				...init,
				headers,
				redirect: "manual",
			});
		},
	};
	const login = async () => {
		const response = await app.request("/login", {
			method: "POST",
			body: new URLSearchParams({ password: config.participantPassword }),
		});
		return { cookie: response.headers.get("set-cookie")!.split(";")[0]! };
	};
	return { app, store, path, url, login };
}
