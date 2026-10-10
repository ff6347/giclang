// ABOUTME: Configures isolated Chromium acceptance tests for Skill export hosts.
// ABOUTME: Starts fresh editor and production-site servers on separate ports.

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./skill-e2e",
	forbidOnly: true,
	fullyParallel: false,
	workers: 1,
	retries: 0,
	timeout: 30_000,
	expect: { timeout: 5_000 },
	globalTimeout: 300_000,
	reporter: "list",
	use: {
		actionTimeout: 10_000,
		navigationTimeout: 10_000,
		trace: "retain-on-failure",
	},
	projects: [
		{
			name: "editor-chromium",
			testMatch: [
				"editor.spec.ts",
				"example-copy.spec.ts",
				"editor-copy-feedback.spec.ts",
				"editor-documentation-copy.spec.ts",
				"editor-documentation-export.spec.ts",
			],
			use: {
				...devices["Desktop Chrome"],
				browserName: "chromium",
				baseURL: "http://127.0.0.1:5173",
			},
		},
		{
			name: "site-chromium",
			testMatch: [
				"site.spec.ts",
				"example-copy.spec.ts",
				"site-copy-feedback.spec.ts",
				"site-documentation-copy.spec.ts",
				"site-documentation-export.spec.ts",
			],
			use: {
				...devices["Desktop Chrome"],
				browserName: "chromium",
				baseURL: "http://127.0.0.1:4322",
			},
		},
	],
	webServer: [
		{
			command: "pnpm dev:browser --host 127.0.0.1",
			url: "http://127.0.0.1:5173",
			reuseExistingServer: false,
			timeout: 120_000,
			stdout: "pipe",
			stderr: "pipe",
		},
		{
			command: "pnpm build:site && node apps/site/scripts/serve-site-tests.mjs",
			url: "http://127.0.0.1:4322",
			reuseExistingServer: false,
			timeout: 120_000,
			stdout: "pipe",
			stderr: "pipe",
		},
	],
});
