// ABOUTME: Configures Firefox browser tests for the GIC browser shell.
// ABOUTME: Starts the Vite server and captures traces for retried user flows.

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	forbidOnly: true,
	retries: 1,
	reporter: "list",
	use: {
		baseURL: "http://127.0.0.1:5173",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] },
		},
	],
	webServer: {
		command: "pnpm dev:browser --host 127.0.0.1",
		url: "http://127.0.0.1:5173",
		reuseExistingServer: false,
		stdout: "pipe",
		stderr: "pipe",
	},
});
