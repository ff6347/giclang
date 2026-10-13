// ABOUTME: Configures real-browser acceptance tests for the feedback application.
// ABOUTME: Starts an isolated server with test-only credentials and SQLite storage.

import { mkdirSync, mkdtempSync } from "node:fs";
import { join, resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

mkdirSync("test-results", { recursive: true });
const databaseDirectory = mkdtempSync(
	join(resolve("test-results"), "feedback-"),
);

export default defineConfig({
	testDir: "./e2e",
	forbidOnly: true,
	fullyParallel: false,
	workers: 1,
	retries: 1,
	reporter: "list",
	use: {
		baseURL: "http://127.0.0.1:4174",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium-desktop",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "firefox-desktop",
			use: { ...devices["Desktop Firefox"] },
		},
		{
			name: "chromium-tablet",
			use: { ...devices["iPad (gen 7)"], browserName: "chromium" },
		},
		{
			name: "firefox-tablet",
			use: { ...devices["iPad (gen 7)"], browserName: "firefox" },
		},
	],
	webServer: {
		command: "node src/main.ts",
		url: "http://127.0.0.1:4174/health",
		reuseExistingServer: false,
		stdout: "pipe",
		stderr: "pipe",
		env: {
			HOST: "127.0.0.1",
			PORT: "4174",
			DB_PATH: join(databaseDirectory, "feedback.sqlite"),
			PARTICIPANT_PASSWORD: "test-participant-password",
			ADMIN_SECRET: "test-admin-secret-for-feedback-e2e",
			COOKIE_SECRET: "test-cookie-secret-for-feedback-e2e",
			FORM_OPEN: "true",
		},
	},
});
