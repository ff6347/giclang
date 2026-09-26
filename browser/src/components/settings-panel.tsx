import {
	Button,
	Checkbox,
	Collapsible,
	Field,
	Select,
	Switch,
} from "@base-ui/react";
import { ChevronRight } from "pixelarticons/react";
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
import { filterModels } from "../lib/model-preferences.ts";
import { SettingsModelPicker } from "./settings-model-picker.tsx";

function SettingsSelect<Value extends string>({
	label,
	value,
	choices,
	onChange,
}: {
	label: string;
	value: Value;
	choices: readonly { value: Value; label: string }[];
	onChange: (value: Value) => void;
}) {
	return (
		<Field.Root className="settings-row">
			<Field.Label>{label}</Field.Label>
			<Select.Root
				items={choices}
				value={value}
				onValueChange={(next) => next && onChange(next)}
			>
				<Select.Trigger className="application-input settings-control settings-select-trigger">
					<Select.Value className="settings-select-value" />
					<Select.Icon className="settings-select-indicator">▾</Select.Icon>
				</Select.Trigger>
				<Select.Portal>
					<Select.Positioner
						alignItemWithTrigger={false}
						sideOffset={4}
						className="settings-picker-positioner"
					>
						<Select.Popup className="settings-picker-popup settings-select-popup">
							<Select.List>
								{choices.map((choice) => (
									<Select.Item
										key={choice.value}
										value={choice.value}
										className="settings-picker-item"
									>
										<Select.ItemText>{choice.label}</Select.ItemText>
									</Select.Item>
								))}
							</Select.List>
						</Select.Popup>
					</Select.Positioner>
				</Select.Portal>
			</Select.Root>
		</Field.Root>
	);
}

function ModelSettings({
	provider,
	models,
	enabledModelIds,
	onModelVisibilityChange,
}: {
	provider: "OpenCode Zen" | "OpenRouter";
	models: readonly OpencodeModel[];
	enabledModelIds: readonly string[];
	onModelVisibilityChange: (id: string, enabled: boolean) => void;
}) {
	const [search, setSearch] = useState("");
	const matchingModels = filterModels(models, search);
	return (
		<Collapsible.Root className="settings-advanced">
			<Collapsible.Trigger className="application-button settings-advanced-trigger">
				{provider} advanced model settings
				<ChevronRight
					aria-hidden="true"
					className="settings-collapse-indicator"
				/>
			</Collapsible.Trigger>
			<Collapsible.Panel keepMounted className="settings-advanced-panel">
				{models.length === 0 ? (
					<p>No eligible models for {provider}.</p>
				) : (
					<>
						<Field.Root className="settings-row">
							<Field.Label>Search {provider} models</Field.Label>
							<Field.Control
								className="application-input"
								type="search"
								value={search}
								onChange={(event) => setSearch(event.currentTarget.value)}
							/>
						</Field.Root>
						{matchingModels.length === 0 && (
							<p role="status">No matching models for {provider}.</p>
						)}
						<ul className="settings-model-list">
							{matchingModels.map((model) => {
								const prices = model.pricing?.split(", ");
								const verified = model.referenceToolsVerified === true;
								return (
									<li key={model.id} className="settings-model">
										<span className="settings-model-name">{model.name}</span>
										<Switch.Root
											aria-label={`Enable ${model.name}`}
											checked={verified && enabledModelIds.includes(model.id)}
											disabled={!verified}
											onCheckedChange={(checked) =>
												onModelVisibilityChange(model.id, checked)
											}
											className="settings-switch"
										>
											<Switch.Thumb className="settings-switch-thumb" />
										</Switch.Root>
										{!verified && (
											<span className="settings-model-price">
												Reference tools not verified
											</span>
										)}
										<span className="settings-model-price">
											{prices?.[0] && prices[1]
												? `${model.isFree === true ? "Free — " : ""}Input: ${prices[0]} · Output: ${prices[1]}`
												: "Price unavailable"}
										</span>
										{model.otherCharges === true && (
											<span className="settings-model-price">
												Additional charges may apply.
											</span>
										)}
										{model.accountLimit && (
											<span className="settings-model-price">
												{model.accountLimit}
											</span>
										)}
									</li>
								);
							})}
						</ul>
					</>
				)}
			</Collapsible.Panel>
		</Collapsible.Root>
	);
}

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
	enabledModelIds,
	selectedModel,
	modelError,
	onRetryModels,
	onModelChange,
	onModelVisibilityChange,
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
	readonly enabledModelIds: readonly string[];
	readonly selectedModel: string;
	readonly modelError: string | null;
	readonly onRetryModels: () => void;
	readonly onModelChange: (model: string) => void;
	readonly onModelVisibilityChange: (id: string, enabled: boolean) => void;
	readonly onProviderAuthenticated: (status: ProviderCredentialStatus) => void;
}) {
	const [apiKey, setApiKey] = useState("");
	const [openrouterApiKey, setOpenrouterApiKey] = useState("");
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
	const authenticateOpenrouter = async () => {
		if (desktop === undefined || openrouterApiKey.trim().length === 0) return;
		const status = await desktop.authenticateOpenrouter(openrouterApiKey);
		setOpenrouterApiKey("");
		onProviderAuthenticated(status);
	};
	const signOutOpenrouter = async () => {
		if (desktop === undefined) return;
		onProviderAuthenticated(await desktop.signOutOpenrouter());
	};
	return (
		<section
			aria-label="Settings"
			className="workspace-panel padded-panel settings-panel"
		>
			{desktop !== undefined && (
				<>
					<h2>Tutor</h2>
					{(providerStatus?.opencodeAuthenticated === true ||
						providerStatus?.openrouterAuthenticated === true) && (
						<>
							<SettingsModelPicker
								models={models}
								enabledModelIds={enabledModelIds}
								selectedModel={selectedModel}
								onModelChange={onModelChange}
							/>
							{modelError !== null ? (
								<p role="alert">{modelError}</p>
							) : models.length === 0 ? (
								<p role="status">No eligible models are available.</p>
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
					<h3>OpenCode Zen</h3>
					<p className="settings-help">
						Connect OpenCode Zen with an API key to use the desktop tutor.
						Reference lookups may use up to two additional model requests per
						question, which may be billed. Zen does not include token prices in
						its model catalog.
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
							<Field.Root className="settings-row">
								<Field.Label>OpenCode API key</Field.Label>
								<Field.Control
									aria-label="OpenCode API key"
									className="application-input"
									type="password"
									value={apiKey}
									onChange={(event) => setApiKey(event.currentTarget.value)}
								/>
							</Field.Root>
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
						<ModelSettings
							provider="OpenCode Zen"
							models={models.filter((model) =>
								model.id.startsWith("opencode-zen/"),
							)}
							enabledModelIds={enabledModelIds}
							onModelVisibilityChange={onModelVisibilityChange}
						/>
					)}
				</>
			)}
			{desktop !== undefined && (
				<>
					<h3>OpenRouter tutor</h3>
					<p className="settings-help">
						OpenRouter is optional bring-your-own-key access for adults 18 and
						older. Questions send sketch source, diagnostics, output, and
						conversation to OpenRouter, which may route them to third-party
						providers with their own retention terms. Your key stays in native
						storage; cancellation may not prevent billing. Reference lookups may
						use up to two additional model requests per question.
					</p>
					{providerStatus?.openrouterAuthenticated === true ? (
						<>
							<p role="status">
								OpenRouter key saved. It is checked when models load.
							</p>
							<Button
								className="application-button"
								type="button"
								onClick={signOutOpenrouter}
							>
								Sign out of OpenRouter
							</Button>
						</>
					) : (
						<>
							<Field.Root className="settings-row">
								<Field.Label>OpenRouter API key</Field.Label>
								<Field.Control
									aria-label="OpenRouter API key"
									className="application-input"
									type="password"
									value={openrouterApiKey}
									onChange={(event) =>
										setOpenrouterApiKey(event.currentTarget.value)
									}
								/>
							</Field.Root>
							<Button
								className="application-button"
								type="button"
								onClick={authenticateOpenrouter}
								disabled={openrouterApiKey.trim().length === 0}
							>
								Connect OpenRouter
							</Button>
						</>
					)}
					{providerStatus?.openrouterAuthenticated === true && (
						<ModelSettings
							provider="OpenRouter"
							models={models.filter((model) =>
								model.id.startsWith("openrouter/"),
							)}
							enabledModelIds={enabledModelIds}
							onModelVisibilityChange={onModelVisibilityChange}
						/>
					)}
				</>
			)}
			<h2>Workspace</h2>
			<SettingsSelect
				label="Appearance"
				value={appearance}
				onChange={onAppearanceChange}
				choices={[
					{ value: "system", label: "System" },
					{ value: "light", label: "Light" },
					{ value: "dark", label: "Dark" },
				]}
			/>
			<SettingsSelect
				label="Light theme"
				value={lightTheme}
				onChange={onLightThemeChange}
				choices={[
					{ value: "vs-light", label: "VS Light" },
					{ value: "macos-classic", label: "macOS Classic" },
					{ value: "catppuccin-latte", label: "Catppuccin Latte" },
				]}
			/>
			<SettingsSelect
				label="Dark theme"
				value={darkTheme}
				onChange={onDarkThemeChange}
				choices={[
					{ value: "vs-dark", label: "VS Dark" },
					{ value: "nord", label: "Nord" },
					{ value: "catppuccin-frappe", label: "Catppuccin Frappé" },
					{ value: "catppuccin-macchiato", label: "Catppuccin Macchiato" },
					{ value: "catppuccin-mocha", label: "Catppuccin Mocha" },
				]}
			/>
			<label className="settings-option">
				<Checkbox.Root
					aria-label="Allow copying agent responses"
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
					aria-label="Format on save"
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
					aria-label="Canvas frame"
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
