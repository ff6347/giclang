// ABOUTME: Resolves the selected appearance and follows operating-system changes.
// ABOUTME: Applies one effective theme to the shared browser and desktop document.

import { useEffect, useState } from "react";
import {
	resolveTheme,
	type Appearance,
	type DarkTheme,
	type LightTheme,
	type ResolvedTheme,
} from "../lib/theme.ts";

const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

export function useTheme(
	appearance: Appearance,
	lightTheme: LightTheme,
	darkTheme: DarkTheme,
): ResolvedTheme {
	const [systemIsDark, setSystemIsDark] = useState(
		() => window.matchMedia(SYSTEM_DARK_QUERY).matches,
	);
	const theme = resolveTheme(appearance, systemIsDark, lightTheme, darkTheme);

	useEffect(() => {
		const media = window.matchMedia(SYSTEM_DARK_QUERY);
		const update = () => setSystemIsDark(media.matches);
		media.addEventListener("change", update);
		update();
		return () => media.removeEventListener("change", update);
	}, []);

	useEffect(() => {
		document.documentElement.dataset["theme"] = theme;
	}, [theme]);

	return theme;
}
