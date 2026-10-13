// ABOUTME: Runs the feedback HTTP server with local assets and persistent SQLite storage.
// ABOUTME: Restricts file permissions and shuts down without logging request data or secrets.

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { openStore } from "./store.ts";

const startupError = () => {
	console.error(
		"Feedback server could not start. Check configuration and database access.",
	);
	process.exitCode = 1;
};

try {
	const development = process.argv.includes("--development");
	const config = loadConfig(process.env, development);
	process.umask(0o077);
	mkdirSync(dirname(config.dbPath), { recursive: true });
	const store = openStore(config.dbPath);
	const app = createApp(config, store);
	const server = serve({
		fetch: app.fetch,
		hostname: config.host,
		port: config.port,
	});
	if (development) {
		server.once("listening", () => {
			const address = server.address();
			if (address && typeof address === "object")
				console.info(
					`Feedback development server listening on port ${address.port}.`,
				);
		});
	}
	server.on("error", () => {
		store.close();
		startupError();
	});
	const shutdown = () => {
		server.close(() => store.close());
	};
	process.once("SIGTERM", shutdown);
	process.once("SIGINT", shutdown);
} catch {
	startupError();
}
