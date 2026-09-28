// ABOUTME: Presents enabled tutor models in an accessible searchable picker.
// ABOUTME: Keeps unavailable models out of selection without changing the catalog.

import { Combobox } from "@base-ui/react";
import { Check, ChevronDown, WarningDiamond } from "pixelarticons/react";
import type { OpencodeModel } from "../lib/desktop-host.ts";
import {
	agentModelLabel,
	agentModelProvider,
	deriveVisibleModels,
} from "../lib/model-preferences.ts";

function modelLabel(model: OpencodeModel): string {
	const selected = agentModelLabel(model);
	if (model.id.startsWith("openai-codex/")) {
		return `${selected} — Subscription access; availability checked on send`;
	}
	const cost = model.pricing ?? "Price unavailable";
	const charges =
		model.otherCharges === true ? " · Additional charges may apply" : "";
	return `${selected} — ${model.isFree === true ? "Free · " : ""}${cost}${charges}`;
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
	const labels = new Map(choices.map((model) => [model.id, modelLabel(model)]));
	const selectedLabels = new Map(
		choices.map((model) => [model.id, agentModelLabel(model)]),
	);
	const selected = choices.find((model) => model.id === selectedModel);
	const verification =
		selected?.referenceToolsVerified === true
			? "Reference tools verified"
			: "Reference tools not verified";
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
					itemToStringLabel={(id) => selectedLabels.get(id) ?? id}
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
								: `Select tutor model. ${agentModelProvider(selected)} · ${selected.name} · Effort: provider default. ${verification}`
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
											{agentModelProvider(model)} · {model.name} · Effort:
											default
										</span>
										<span
											className="agent-model-verification"
											title={
												model.referenceToolsVerified === true
													? "Reference tools verified"
													: "Reference tools not verified"
											}
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
									className="application-input agent-model-search"
									placeholder="Search models"
								/>
								<Combobox.List className="agent-model-list">
									{(item) => (
										<Combobox.Item
											key={item}
											value={item}
											className="settings-picker-item"
										>
											{labels.get(item) ?? item}
											<Combobox.ItemIndicator>
												<Check aria-hidden="true" />
											</Combobox.ItemIndicator>
										</Combobox.Item>
									)}
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
