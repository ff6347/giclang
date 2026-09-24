import { Button, Checkbox } from "@base-ui/react";
import type { Appearance, DarkTheme, LightTheme } from "../lib/theme.ts";
import {
	assistantPresentation,
	supportFileLabel,
	supportFileTitle,
} from "../lib/workspace-support.ts";
import type { WorkspaceController } from "../hooks/use-workspace.ts";

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
	workspace,
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
	workspace: WorkspaceController | undefined;
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
			{workspace !== undefined && (
				<>
					<h2>Projects folder</h2>
					<div className="projects-folder-row">
						<span className="projects-folder-path">
							{workspace.projectsDirectory ?? "Loading…"}
						</span>
						<Button
							className="application-button"
							type="button"
							onClick={workspace.chooseProjectsDirectory}
						>
							Choose folder…
						</Button>
					</div>
					<h2>Support files</h2>
					<div className="workspace-support-actions">
						<Button
							className="application-button"
							type="button"
							onClick={workspace.repair}
						>
							{workspace.status?.installed === true
								? "Repair and update support files"
								: "Install support files"}
						</Button>
						<Button
							className="application-button"
							type="button"
							onClick={workspace.uninstall}
							disabled={workspace.status?.installed !== true}
						>
							Uninstall support files
						</Button>
					</div>
					{workspace.status !== null && (
						<ul className="support-files">
							{workspace.status.files.map((file) => (
								<li key={file.path} className="support-file-row">
									<span className="support-file-name">
										{supportFileTitle(file.path)}
									</span>
									<span
										className={`support-file-state support-file-state-${file.state}`}
									>
										{supportFileLabel(file.state)}
									</span>
									{file.state === "modified" && (
										<span className="support-file-actions">
											<Button
												className="application-button"
												type="button"
												onClick={() => workspace.resolve(file.path, "keep")}
											>
												Keep my version
											</Button>
											<Button
												className="application-button"
												type="button"
												onClick={() => workspace.resolve(file.path, "replace")}
											>
												Replace with GIC version
											</Button>
										</span>
									)}
								</li>
							))}
						</ul>
					)}
					<h2>External assistants</h2>
					{workspace.assistants.map((assistant) => {
						const presentation = assistantPresentation(
							assistant.name,
							assistant.available,
						);
						return (
							<div key={assistant.name} className="assistant-row">
								<span className="assistant-name">{presentation.title}</span>
								{presentation.canLaunch ? (
									<Button
										className="application-button"
										type="button"
										onClick={() => workspace.launch(assistant.name)}
									>
										{presentation.label}
									</Button>
								) : (
									<span className="assistant-guidance">
										{presentation.guidance}
									</span>
								)}
							</div>
						);
					})}
				</>
			)}
		</section>
	);
}
