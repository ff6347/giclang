// ABOUTME: Shares keyboard, clipboard, and Chromium permission interactions for Skill tests.
// ABOUTME: Uses actual browser APIs and CDP rather than browser mocks.

import {
	expect,
	type Browser,
	type Locator,
	type Page,
} from "@playwright/test";

export async function activateByKeyboard(page: Page, locator: Locator) {
	await locator.focus();
	await page.keyboard.press("Enter");
}

export async function readClipboard(page: Page) {
	return page.evaluate(() => navigator.clipboard.readText());
}

export async function grantClipboardPermissions(page: Page) {
	await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
		origin: new URL(page.url()).origin,
	});
}

export async function denyClipboardWritePermission(
	browser: Browser,
	page: Page,
) {
	const session = await browser.newBrowserCDPSession();
	try {
		const { targetInfos } = await session.send("Target.getTargets");
		const pageTarget = targetInfos.find(
			(target) => target.type === "page" && target.url === page.url(),
		);
		if (!pageTarget?.browserContextId) {
			throw new Error("Could not locate the Chromium page context.");
		}
		await session.send("Browser.setPermission", {
			browserContextId: pageTarget.browserContextId,
			origin: new URL(page.url()).origin,
			permission: { name: "clipboard-write" },
			setting: "denied",
		});
	} finally {
		await session.detach();
	}
}

export async function restoreClipboardPermissions(page: Page) {
	await page.context().clearPermissions();
	await grantClipboardPermissions(page);
}

export async function expectNoHorizontalOverflow(page: Page) {
	const overflow = await page.evaluate(
		() =>
			document.documentElement.scrollWidth -
			document.documentElement.clientWidth,
	);
	expect(overflow).toBeLessThanOrEqual(1);
}
