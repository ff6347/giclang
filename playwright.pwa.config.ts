// ABOUTME: Runs production PWA lifecycle acceptance in the supported browser engines.
// ABOUTME: Builds and serves the precached application instead of Vite's development server.

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./pwa-e2e",
	forbidOnly: true,
	fullyParallel: false,
	retries: 1,
	workers: 1,
	reporter: "list",
	use: {
		baseURL: "http://127.0.0.1:4173",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chrome",
			use: { ...devices["Desktop Chrome"], channel: "chrome" },
		},
		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] },
		},
		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},
	],
	webServer: {
		command: "pnpm prepare:pwa-tests && node scripts/serve-pwa-tests.mjs",
		url: "http://127.0.0.1:4173",
		reuseExistingServer: false,
		stdout: "pipe",
		stderr: "pipe",
	},
});
