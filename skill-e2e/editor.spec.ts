// ABOUTME: Verifies the editor exposes only the raw-skill and ZIP links.
// ABOUTME: Preserves the active sketch while exercising keyboard download and narrow layout.

import { expect, test } from "@playwright/test";
import { setEditorSource } from "../e2e/editor.ts";
import {
	expectDownloadedSkillArchive,
	readCanonicalSkillExport,
} from "../e2e/skill-export.ts";
import { activateByKeyboard, expectNoHorizontalOverflow } from "./support.ts";

const skillLinkNames = ["Download skill (ZIP)", "View raw skill"];

test("exposes only raw-skill and ZIP links in editor Docs", async ({
	page,
}) => {
	const expected = await readCanonicalSkillExport();
	const source = "point(23, 41);";
	await page.goto("/");
	await expect(
		page.getByRole("alertdialog", { name: "Recover unsaved sketch?" }),
	).toHaveCount(0);
	await setEditorSource(page, source);
	const sourceBefore = await page.locator(".view-line").allTextContents();
	expect(sourceBefore.map((line) => line.replace(/\u00a0/g, " "))).toEqual([
		source,
	]);
	const recoveryBefore = await page.evaluate(() =>
		localStorage.getItem("gic.recovery.v1"),
	);
	expect(recoveryBefore).not.toBeNull();

	await page.getByRole("tab", { name: "Docs", exact: true }).click();
	const docs = page.getByRole("tabpanel", { name: "Docs" });
	await docs.getByRole("tab", { name: "Skill", exact: true }).click();
	const actions = docs
		.getByRole("article", { name: "Skill" })
		.getByRole("region", { name: "Skill actions" });
	const links = actions.getByRole("link");
	await expect(links).toHaveCount(2);
	expect(await links.allTextContents()).toEqual(skillLinkNames);
	await expect(actions.getByRole("button")).toHaveCount(0);
	expect(
		await actions.locator("details, textarea, [role=status]").count(),
	).toBe(0);
	expect(
		await actions.evaluate((element) => {
			const style = getComputedStyle(element);
			return {
				display: style.display,
				flexWrap: style.flexWrap,
				columnGap: style.columnGap,
				rowGap: style.rowGap,
				linkDecorations: Array.from(
					element.querySelectorAll("a"),
					(link) => getComputedStyle(link).textDecorationLine,
				),
			};
		}),
	).toEqual({
		display: "flex",
		flexWrap: "wrap",
		columnGap: "12px",
		rowGap: "12px",
		linkDecorations: ["underline", "underline"],
	});

	const downloadLink = links.nth(0);
	await expect(downloadLink).toHaveAttribute("download", "gic-agent.zip");
	expect(await downloadLink.getAttribute("href")).toMatch(
		/^data:application\/zip;base64,/,
	);
	const rawLink = links.nth(1);
	await expect(rawLink).toHaveAttribute(
		"href",
		"https://giclang.cc/skills/gic-agent.txt",
	);
	await expect(rawLink).toHaveAttribute("target", "_blank");

	const downloadPromise = page.waitForEvent("download");
	await activateByKeyboard(page, downloadLink);
	await expectDownloadedSkillArchive(await downloadPromise, expected);

	await page.setViewportSize({ width: 375, height: 812 });
	await expectNoHorizontalOverflow(page);
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.getByRole("tab", { name: "Gestalten", exact: true }).click();
	expect(await page.locator(".view-line").allTextContents()).toEqual(
		sourceBefore,
	);
	expect(
		await page.evaluate(() => localStorage.getItem("gic.recovery.v1")),
	).toBe(recoveryBefore);
	await expect(
		page.getByRole("alertdialog", { name: "Recover unsaved sketch?" }),
	).toHaveCount(0);
});
