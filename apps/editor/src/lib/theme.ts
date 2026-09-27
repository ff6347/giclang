// ABOUTME: Defines persisted appearance preferences and their effective theme.
// ABOUTME: Keeps system, light, and dark selection independent from React and Monaco.

export type Appearance = "dark" | "light" | "system";
export type DarkTheme =
	| "catppuccin-frappe"
	| "catppuccin-macchiato"
	| "catppuccin-mocha"
	| "nord"
	| "vs-dark";
export type LightTheme = "catppuccin-latte" | "macos-classic" | "vs-light";
export type ResolvedTheme = DarkTheme | LightTheme;
export type WindowTheme = "dark" | "light";

export function parseAppearance(value: string | null): Appearance {
	return value === "dark" || value === "light" || value === "system"
		? value
		: "system";
}

export function parseLightTheme(value: string | null): LightTheme {
	return value === "catppuccin-latte" ||
		value === "macos-classic" ||
		value === "vs-light"
		? value
		: "vs-light";
}

export function parseDarkTheme(value: string | null): DarkTheme {
	return value === "catppuccin-frappe" ||
		value === "catppuccin-macchiato" ||
		value === "catppuccin-mocha" ||
		value === "nord" ||
		value === "vs-dark"
		? value
		: "vs-dark";
}

export function resolveTheme(
	appearance: Appearance,
	systemIsDark: boolean,
	lightTheme: LightTheme,
	darkTheme: DarkTheme,
): ResolvedTheme {
	if (appearance === "light") return lightTheme;
	if (appearance === "dark") return darkTheme;
	return systemIsDark ? darkTheme : lightTheme;
}

export function resolveWindowTheme(appearance: Appearance): WindowTheme | null {
	return appearance === "system" ? null : appearance;
}
