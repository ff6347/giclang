// ABOUTME: Verifies persisted appearance preferences and system-theme resolution.
// ABOUTME: Keeps browser, desktop, and Monaco theme selection on one shared rule.

import assert from "node:assert/strict";
import test from "node:test";
import {
	parseAppearance,
	parseDarkTheme,
	parseLightTheme,
	resolveTheme,
	resolveWindowTheme,
} from "../lib/theme.ts";

test("appearance defaults to the system preference", () => {
	assert.equal(parseAppearance(null), "system");
	assert.equal(parseAppearance("unsupported"), "system");
});

test("theme selections default to VS Light and VS Dark", () => {
	assert.equal(parseLightTheme(null), "vs-light");
	assert.equal(parseLightTheme("unsupported"), "vs-light");
	assert.equal(parseDarkTheme(null), "vs-dark");
	assert.equal(parseDarkTheme("unsupported"), "vs-dark");
});

test("theme selections accept every named palette", () => {
	assert.equal(parseLightTheme("vs-light"), "vs-light");
	assert.equal(parseLightTheme("macos-classic"), "macos-classic");
	assert.equal(parseLightTheme("catppuccin-latte"), "catppuccin-latte");
	assert.equal(parseDarkTheme("vs-dark"), "vs-dark");
	assert.equal(parseDarkTheme("nord"), "nord");
	assert.equal(parseDarkTheme("catppuccin-frappe"), "catppuccin-frappe");
	assert.equal(parseDarkTheme("catppuccin-macchiato"), "catppuccin-macchiato");
	assert.equal(parseDarkTheme("catppuccin-mocha"), "catppuccin-mocha");
});

test("system appearance follows the operating system with selected themes", () => {
	assert.equal(
		resolveTheme("system", false, "macos-classic", "nord"),
		"macos-classic",
	);
	assert.equal(resolveTheme("system", true, "macos-classic", "nord"), "nord");
	assert.equal(resolveTheme("light", true, "vs-light", "vs-dark"), "vs-light");
	assert.equal(resolveTheme("dark", false, "vs-light", "vs-dark"), "vs-dark");
});

test("system appearance clears a native window theme override", () => {
	assert.equal(resolveWindowTheme("system"), null);
	assert.equal(resolveWindowTheme("light"), "light");
	assert.equal(resolveWindowTheme("dark"), "dark");
});
