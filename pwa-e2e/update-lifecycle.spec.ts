// ABOUTME: Verifies downloaded PWA updates wait for explicit activation.
// ABOUTME: Confirms postponing an update preserves the current editing session.

import { expect, test, type Page } from "@playwright/test";
import { copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { setEditorSource } from "../e2e/editor.ts";

const initialServiceWorker = fileURLToPath(
	new URL("../browser/.pwa-test/sw-initial.js", import.meta.url),
);
const updatedServiceWorker = fileURLToPath(
	new URL("../browser/.pwa-test/sw-updated.js", import.meta.url),
);
const servedServiceWorker = fileURLToPath(
	new URL("../browser/dist/sw.js", import.meta.url),
);

async function waitForActiveServiceWorker(page: Page) {
	await expect
		.poll(
			() =>
				page.evaluate(async () => {
					const registration = await navigator.serviceWorker.getRegistration();
					return registration?.active?.state;
				}),
			{ timeout: 10_000 },
		)
		.toBe("activated");
}

test("keeps a downloaded update waiting until the student confirms it", async ({
	page,
}) => {
	await fetch("http://127.0.0.1:4173/__pwa_test_online", { method: "POST" });
	await copyFile(initialServiceWorker, servedServiceWorker);
	await page.goto("/");
	await waitForActiveServiceWorker(page);
	await page.reload();

	const source = 'circle(50, 50, 20);\nprint("keep working");';
	await setEditorSource(page, source);
	await expect(page.locator("#output")).toHaveText("Line 2: keep working");

	await copyFile(updatedServiceWorker, servedServiceWorker);
	await page.evaluate(async () => {
		const registration = await navigator.serviceWorker.ready;
		await registration.update();
	});

	const update = page.getByRole("region", { name: "Application update" });
	await expect(update).toContainText("An application update is ready.");
	await expect
		.poll(() =>
			page.evaluate(async () => {
				const registration = await navigator.serviceWorker.ready;
				return {
					active: registration.active?.state,
					waiting: registration.waiting?.state,
				};
			}),
		)
		.toEqual({ active: "activated", waiting: "installed" });

	await update.getByRole("button", { name: "Continue working" }).click();
	await expect(update).toContainText("The update will wait until you reload.");
	await expect(page.locator(".view-line")).toHaveText([
		"circle(50, 50, 20);",
		'print("keep working");',
	]);
	expect(
		await page.evaluate(async () => {
			const registration = await navigator.serviceWorker.ready;
			return registration.waiting?.state;
		}),
	).toBe("installed");

	await page.evaluate(() => {
		navigator.serviceWorker.addEventListener(
			"controllerchange",
			() => localStorage.setItem("gic.pwa-test.controller-changed", "true"),
			{ once: true },
		);
	});
	await Promise.all([
		page.waitForEvent("load"),
		update.getByRole("button", { name: "Update and reload" }).click(),
	]);
	expect(
		await page.evaluate(() =>
			localStorage.getItem("gic.pwa-test.controller-changed"),
		),
	).toBe("true");
	await expect
		.poll(() =>
			page.evaluate(async () => {
				const registration = await navigator.serviceWorker.ready;
				return registration.waiting;
			}),
		)
		.toBeNull();

	const recovery = page.getByRole("alertdialog", {
		name: "Recover unsaved sketch?",
	});
	await expect(recovery).toBeVisible();
	await recovery.getByRole("button", { name: "Restore" }).click();
	await expect(page.locator(".view-line")).toHaveText([
		"circle(50, 50, 20);",
		'print("keep working");',
	]);
});

test.afterEach(async () => {
	await fetch("http://127.0.0.1:4173/__pwa_test_online", { method: "POST" });
	await copyFile(initialServiceWorker, servedServiceWorker);
});
