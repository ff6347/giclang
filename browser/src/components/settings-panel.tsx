import { Button, Checkbox } from "@base-ui/react";
import type { Appearance, DarkTheme, LightTheme } from "../lib/theme.ts";

export function SettingsPanel({
	appearance,
	canvasFrame,
	darkTheme,
	formatOnSave,
	lightTheme,
	onAppearanceChange,
	onCanvasFrameChange,
	onDarkThemeChange,
	onFormatOnSaveChange,
	onLightThemeChange,
	onResetLayout,
}: {
	appearance: Appearance;
	canvasFrame: boolean;
	darkTheme: DarkTheme;
	formatOnSave: boolean;
	lightTheme: LightTheme;
	onAppearanceChange: (appearance: Appearance) => void;
	onCanvasFrameChange: (checked: boolean) => void;
	onDarkThemeChange: (theme: DarkTheme) => void;
	onFormatOnSaveChange: (checked: boolean) => void;
	onLightThemeChange: (theme: LightTheme) => void;
	onResetLayout: () => void;
}) {
	return (
		<section aria-label="Settings" className="workspace-panel padded-panel">
			<h2>Workspace</h2>
			<label className="settings-option">
				Appearance
				<select
					aria-label="Appearance"
					className="application-input"
					value={appearance}
					onChange={(event) =>
						onAppearanceChange(event.currentTarget.value as Appearance)
					}
				>
					<option value="system">System</option>
					<option value="light">Light</option>
					<option value="dark">Dark</option>
				</select>
			</label>
			<label className="settings-option">
				Light theme
				<select
					aria-label="Light theme"
					className="application-input"
					value={lightTheme}
					onChange={(event) =>
						onLightThemeChange(event.currentTarget.value as LightTheme)
					}
				>
					<option value="vs-light">VS Light</option>
					<option value="macos-classic">macOS Classic</option>
					<option value="catppuccin-latte">Catppuccin Latte</option>
				</select>
			</label>
			<label className="settings-option">
				Dark theme
				<select
					aria-label="Dark theme"
					className="application-input"
					value={darkTheme}
					onChange={(event) =>
						onDarkThemeChange(event.currentTarget.value as DarkTheme)
					}
				>
					<option value="vs-dark">VS Dark</option>
					<option value="nord">Nord</option>
					<option value="catppuccin-frappe">Catppuccin Frappé</option>
					<option value="catppuccin-macchiato">Catppuccin Macchiato</option>
					<option value="catppuccin-mocha">Catppuccin Mocha</option>
				</select>
			</label>
			<label className="settings-option">
				<Checkbox.Root
					checked={formatOnSave}
					className="settings-checkbox"
					onCheckedChange={onFormatOnSaveChange}
				>
					<Checkbox.Indicator className="settings-checkbox-indicator" />
				</Checkbox.Root>
				Format on save
			</label>
			<label className="settings-option">
				<Checkbox.Root
					checked={canvasFrame}
					className="settings-checkbox"
					onCheckedChange={onCanvasFrameChange}
				>
					<Checkbox.Indicator className="settings-checkbox-indicator" />
				</Checkbox.Root>
				Canvas frame
			</label>
			<Button
				className="application-button"
				type="button"
				onClick={onResetLayout}
			>
				Reset Layout
			</Button>
		</section>
	);
}
