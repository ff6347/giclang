import { Button, Checkbox } from "@base-ui/react";
import { useState } from "react";
import type { Appearance, DarkTheme, LightTheme } from "../lib/theme.ts";
import {
	assistantPresentation,
	supportFileLabel,
	supportFileTitle,
} from "../lib/workspace-support.ts";
import type { WorkspaceController } from "../hooks/use-workspace.ts";
import type {
	DesktopHost,
	OpencodeModel,
	ProviderCredentialStatus,
} from "../lib/desktop-host.ts";

export function SettingsPanel({
	agentResponseCopying,
	appearance,
	canvasFrame,
	darkTheme,
	formatOnSave,
	lightTheme,
	onAgentResponseCopyingChange,
	onAppearanceChange,
	onCanvasFrameChange,
	onDarkThemeChange,
	onFormatOnSaveChange,
	onLightThemeChange,
	onResetLayout,
	workspace,
	desktop,
	providerStatus,
	models,
	selectedModel,
	modelError,
	onRetryModels,
	onModelChange,
	onProviderAuthenticated,
}: {
	agentResponseCopying: boolean;
	appearance: Appearance;
	canvasFrame: boolean;
	darkTheme: DarkTheme;
	formatOnSave: boolean;
	lightTheme: LightTheme;
	onAgentResponseCopyingChange: (checked: boolean) => void;
	onAppearanceChange: (appearance: Appearance) => void;
	onCanvasFrameChange: (checked: boolean) => void;
	onDarkThemeChange: (theme: DarkTheme) => void;
	onFormatOnSaveChange: (checked: boolean) => void;
	onLightThemeChange: (theme: LightTheme) => void;
	onResetLayout: () => void;
	readonly workspace: WorkspaceController | undefined;
	readonly desktop: DesktopHost | undefined;
	readonly providerStatus: ProviderCredentialStatus | null;
	readonly models: readonly OpencodeModel[];
	readonly selectedModel: string;
	readonly modelError: string | null;
	readonly onRetryModels: () => void;
	readonly onModelChange: (model: string) => void;
	readonly onProviderAuthenticated: (status: ProviderCredentialStatus) => void;
}) {
	const [apiKey, setApiKey] = useState("");
	const authenticate = async () => {
		if (desktop === undefined || apiKey.trim().length === 0) return;
		const status = await desktop.authenticateOpencode(apiKey);
		setApiKey("");
		onProviderAuthenticated(status);
	};
	const signOut = async () => {
		if (desktop === undefined) return;
		onProviderAuthenticated(await desktop.signOutOpencode());
	};
	return (
		<section aria-label="Settings" className="workspace-panel padded-panel">
			<h2>OpenCode tutor</h2>
			{desktop !== undefined && (
				<>
					<p className="settings-help">
						Connect OpenCode Zen with an API key to use the desktop tutor.
					</p>
					{providerStatus?.opencodeAuthenticated === true ? (
						<>
							<p role="status">
								API key saved; it has not been verified. It will be checked when
								you send a question.
							</p>
							<Button
								className="application-button"
								type="button"
								onClick={signOut}
							>
								Sign out
							</Button>
						</>
					) : (
						<>
							<label className="settings-option">
								API key
								<input
									aria-label="OpenCode API key"
									className="application-input"
									type="password"
									value={apiKey}
									onChange={(event) => setApiKey(event.currentTarget.value)}
								/>
							</label>
							<Button
								className="application-button"
								type="button"
								onClick={authenticate}
								disabled={apiKey.trim().length === 0}
							>
								Connect OpenCode
							</Button>
						</>
					)}
					{providerStatus?.opencodeAuthenticated === true && (
						<>
							<label className="settings-option">
								Model
								<select
									aria-label="OpenCode model"
									className="application-input"
									value={selectedModel}
									onChange={(event) => onModelChange(event.currentTarget.value)}
								>
									{models.map((model) => (
										<option key={model.id} value={model.id}>
											{model.name}
										</option>
									))}
								</select>
							</label>
							{modelError !== null ? (
								<p role="alert">{modelError}</p>
							) : models.length === 0 ? (
								<p role="status">
									No eligible OpenCode Zen models are available.
								</p>
							) : null}
							{(modelError !== null || models.length === 0) && (
								<Button
									className="application-button"
									type="button"
									onClick={onRetryModels}
								>
									Retry models
								</Button>
							)}
						</>
					)}
				</>
			)}
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
					checked={agentResponseCopying}
					className="settings-checkbox"
					onCheckedChange={onAgentResponseCopyingChange}
				>
					<Checkbox.Indicator className="settings-checkbox-indicator" />
				</Checkbox.Root>
				Allow copying agent responses
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
