// ABOUTME: Presents enabled tutor models in an accessible searchable picker.
// ABOUTME: Keeps unavailable models out of selection without changing the catalog.

import { Combobox, Field } from "@base-ui/react";
import type { OpencodeModel } from "../lib/desktop-host.ts";
import {
	agentModelLabel,
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
	return (
		<Field.Root className="agent-model-picker">
			<Field.Label>Model</Field.Label>
			<div className="agent-model-control">
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
						value={
							choices.some((model) => model.id === selectedModel)
								? selectedModel
								: null
						}
						onValueChange={(value) => onModelChange(value ?? "")}
						disabled={disabled}
					>
						<Combobox.Input
							aria-label="Search tutor models"
							className="application-input"
							placeholder="Choose a model"
						/>
						<Combobox.Portal>
							<Combobox.Positioner className="settings-picker-positioner">
								<Combobox.Popup className="settings-picker-popup agent-model-popup">
									<Combobox.List>
										{(item) => (
											<Combobox.Item
												key={item}
												value={item}
												className="settings-picker-item"
											>
												{labels.get(item) ?? item}
												<Combobox.ItemIndicator>✓</Combobox.ItemIndicator>
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
		</Field.Root>
	);
}
