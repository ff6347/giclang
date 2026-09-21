// ABOUTME: Registers Monaco themes matching GiC's named application palettes.
// ABOUTME: Maps GIC token categories to macOS Classic, Nord, and Catppuccin colors.

import * as monaco from "monaco-editor/editor/editor.api.js";
import type { ResolvedTheme } from "./theme.ts";

type CustomThemeName = Exclude<ResolvedTheme, "vs-dark" | "vs-light">;

interface CatppuccinPalette {
	readonly base: string;
	readonly blue: string;
	readonly green: string;
	readonly mauve: string;
	readonly overlay0: string;
	readonly overlay2: string;
	readonly peach: string;
	readonly rosewater: string;
	readonly surface0: string;
	readonly teal: string;
	readonly text: string;
}

function catppuccinTheme(
	palette: CatppuccinPalette,
	base: "vs" | "vs-dark",
): monaco.editor.IStandaloneThemeData {
	return {
		base,
		inherit: false,
		rules: [
			{
				token: "comment",
				foreground: palette.overlay2,
				fontStyle: "italic",
			},
			{ token: "delimiter", foreground: palette.overlay2 },
			{ token: "identifier", foreground: palette.text },
			{ token: "keyword", foreground: palette.mauve },
			{ token: "number", foreground: palette.peach },
			{ token: "operator", foreground: palette.teal },
			{ token: "string", foreground: palette.green },
			{ token: "type.identifier", foreground: palette.blue },
		],
		colors: {
			"editor.background": `#${palette.base}`,
			"editor.foreground": `#${palette.text}`,
			"editor.lineHighlightBackground": `#${palette.surface0}`,
			"editorLineNumber.foreground": `#${palette.overlay0}`,
			"editorCursor.foreground": `#${palette.rosewater}`,
		},
	};
}

const CUSTOM_THEMES: Record<
	CustomThemeName,
	monaco.editor.IStandaloneThemeData
> = {
	"macos-classic": {
		base: "vs",
		inherit: false,
		rules: [
			{ token: "comment", foreground: "007FFF" },
			{ token: "identifier", foreground: "000000" },
			{ token: "keyword", foreground: "0433FF" },
			{ token: "number", foreground: "0433FF" },
			{ token: "operator", foreground: "000000" },
			{ token: "string", foreground: "036A07" },
			{ token: "type.identifier", foreground: "0000A2" },
		],
		colors: {
			"editor.background": "#FFFFFF",
			"editor.foreground": "#000000",
			"editor.lineHighlightBackground": "#F5F5F5",
			"editorLineNumber.foreground": "#929292",
			"editorCursor.foreground": "#101010",
		},
	},
	nord: {
		base: "vs-dark",
		inherit: false,
		rules: [
			{ token: "comment", foreground: "616E88" },
			{ token: "delimiter", foreground: "ECEFF4" },
			{ token: "identifier", foreground: "D8DEE9" },
			{ token: "keyword", foreground: "81A1C1" },
			{ token: "number", foreground: "B48EAD" },
			{ token: "operator", foreground: "81A1C1" },
			{ token: "string", foreground: "A3BE8C" },
			{ token: "type.identifier", foreground: "88C0D0" },
		],
		colors: {
			"editor.background": "#2E3440",
			"editor.foreground": "#D8DEE9",
			"editor.lineHighlightBackground": "#3B4252",
			"editorLineNumber.foreground": "#4C566A",
			"editorCursor.foreground": "#D8DEE9",
		},
	},
	"catppuccin-latte": catppuccinTheme(
		{
			base: "EFF1F5",
			blue: "1E66F5",
			green: "40A02B",
			mauve: "8839EF",
			overlay0: "9CA0B0",
			overlay2: "7C7F93",
			peach: "FE640B",
			rosewater: "DC8A78",
			surface0: "CCD0DA",
			teal: "179299",
			text: "4C4F69",
		},
		"vs",
	),
	"catppuccin-frappe": catppuccinTheme(
		{
			base: "303446",
			blue: "8CAAEE",
			green: "A6D189",
			mauve: "CA9EE6",
			overlay0: "737994",
			overlay2: "949CBB",
			peach: "EF9F76",
			rosewater: "F2D5CF",
			surface0: "414559",
			teal: "81C8BE",
			text: "C6D0F5",
		},
		"vs-dark",
	),
	"catppuccin-macchiato": catppuccinTheme(
		{
			base: "24273A",
			blue: "8AADF4",
			green: "A6DA95",
			mauve: "C6A0F6",
			overlay0: "6E738D",
			overlay2: "939AB7",
			peach: "F5A97F",
			rosewater: "F4DBD6",
			surface0: "363A4F",
			teal: "8BD5CA",
			text: "CAD3F5",
		},
		"vs-dark",
	),
	"catppuccin-mocha": catppuccinTheme(
		{
			base: "1E1E2E",
			blue: "89B4FA",
			green: "A6E3A1",
			mauve: "CBA6F7",
			overlay0: "6C7086",
			overlay2: "9399B2",
			peach: "FAB387",
			rosewater: "F5E0DC",
			surface0: "313244",
			teal: "94E2D5",
			text: "CDD6F4",
		},
		"vs-dark",
	),
};

let registered = false;

export function registerEditorThemes(): void {
	if (registered) return;
	for (const [name, theme] of Object.entries(CUSTOM_THEMES)) {
		monaco.editor.defineTheme(name, theme);
	}
	registered = true;
}

export function editorThemeName(theme: ResolvedTheme): string {
	return theme === "vs-light" ? "vs" : theme;
}
