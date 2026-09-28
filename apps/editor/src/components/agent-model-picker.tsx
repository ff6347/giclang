// ABOUTME: Presents enabled tutor models in an accessible searchable picker.
// ABOUTME: Keeps unavailable models out of selection without changing the catalog.

import { Combobox } from "@base-ui/react";
import { Check, ChevronDown, WarningDiamond } from "pixelarticons/react";
import type { OpencodeModel } from "../lib/desktop-host.ts";
import {
	agentModelLabel,
	deriveVisibleModels,
} from "../lib/model-preferences.ts";

function verificationLabel(model: OpencodeModel): string {
	return model.referenceToolsVerified === true
		? "Reference tools verified"
		: "Reference tools not verified";
}

export interface ModelSelection {
	readonly models: readonly OpencodeModel[];
	readonly enabledModelIds: readonly string[];
	readonly selectedModel: string;
	readonly onModelChange: (id: string) => void;
}

export function AgentModelPicker({
	models,
	enabledModelIds,
	selectedModel,
	onModelChange,
	disabled = false,
}: ModelSelection & { readonly disabled?: boolean }) {
	const choices = deriveVisibleModels(models, enabledModelIds);
	const labels = new Map(
		choices.map((model) => [model.id, agentModelLabel(model)]),
	);
	const selected = choices.find((model) => model.id === selectedModel);
	return (
		<div className="agent-model-picker">
			{choices.length === 0 ? (
				<p role="status">
					{models.length === 0
						? "No models available. Check provider connections in Settings."
						: "No models enabled. Enable a model in Settings."}
				</p>
			) : (
				<Combobox.Root
					items={choices.map((model) => model.id)}
					itemToStringLabel={(id) => labels.get(id) ?? id}
					filter={(id, query) =>
						`${labels.get(id) ?? id} ${id}`
							.toLowerCase()
							.includes(query.toLowerCase())
					}
					value={selected?.id ?? null}
					onValueChange={(value) => onModelChange(value ?? "")}
					disabled={disabled}
				>
					<Combobox.Trigger
						aria-label={
							selected === undefined
								? "Select tutor model"
								: `Select tutor model. ${agentModelLabel(selected)}. ${verificationLabel(selected)}`
						}
						className="agent-model-trigger"
						type="button"
					>
						<Combobox.Value placeholder="Choose a model">
							{(value) => {
								const model =
									typeof value === "string"
										? choices.find((choice) => choice.id === value)
										: undefined;
								return model === undefined ? (
									"Choose a model"
								) : (
									<>
										<span className="agent-model-summary">
											{labels.get(value)}
										</span>
										<span
											className="agent-model-verification"
											title={verificationLabel(model)}
										>
											{model.referenceToolsVerified === true ? (
												<Check aria-hidden="true" />
											) : (
												<WarningDiamond aria-hidden="true" />
											)}
										</span>
									</>
								);
							}}
						</Combobox.Value>
						<Combobox.Icon className="agent-model-caret">
							<ChevronDown aria-hidden="true" />
						</Combobox.Icon>
					</Combobox.Trigger>
					<Combobox.Portal>
						<Combobox.Positioner
							align="start"
							className="settings-picker-positioner"
							side="top"
							sideOffset={4}
						>
							<Combobox.Popup
								aria-label="Select tutor model"
								className="settings-picker-popup agent-model-popup"
							>
								<Combobox.Input
									aria-label="Search tutor models"
									className="agent-model-search"
									placeholder="Search models"
								/>
								<Combobox.List className="agent-model-list">
									{(item) => {
										const model = choices.find((choice) => choice.id === item)!;
										return (
											<Combobox.Item
												aria-label={`${labels.get(item)}. ${verificationLabel(model)}`}
												key={item}
												value={item}
												className="settings-picker-item agent-model-item"
											>
												<span className="agent-model-option-label">
													{labels.get(item)}
												</span>
												<span
													className="agent-model-verification"
													title={verificationLabel(model)}
												>
													{model.referenceToolsVerified === true ? (
														<Check aria-hidden="true" />
													) : (
														<WarningDiamond aria-hidden="true" />
													)}
												</span>
												<Combobox.ItemIndicator className="agent-model-selection-indicator">
													<Check aria-hidden="true" />
												</Combobox.ItemIndicator>
											</Combobox.Item>
										);
									}}
								</Combobox.List>
								<Combobox.Empty>No matching models.</Combobox.Empty>
							</Combobox.Popup>
						</Combobox.Positioner>
					</Combobox.Portal>
				</Combobox.Root>
			)}
		</div>
	);
}
