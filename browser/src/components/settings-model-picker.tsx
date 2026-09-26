// ABOUTME: Presents enabled tutor models in an accessible searchable picker.
// ABOUTME: Keeps unavailable models out of selection without changing the catalog.

import { Combobox, Field } from "@base-ui/react";
import type { OpencodeModel } from "../lib/desktop-host.ts";
import { deriveVisibleModels } from "../lib/model-preferences.ts";

function modelLabel(model: OpencodeModel): string {
	const provider = model.id.startsWith("opencode-zen/")
		? "OpenCode Zen"
		: "OpenRouter";
	const cost = model.pricing ?? "Price unavailable";
	const charges =
		model.otherCharges === true ? " · Additional charges may apply" : "";
	return `${provider} · ${model.name} — ${model.isFree === true ? "Free · " : ""}${cost}${charges}`;
}

export function SettingsModelPicker({
	models,
	enabledModelIds,
	selectedModel,
	onModelChange,
}: {
	models: readonly OpencodeModel[];
	enabledModelIds: readonly string[];
	selectedModel: string;
	onModelChange: (id: string) => void;
}) {
	const choices = deriveVisibleModels(models, enabledModelIds);
	const labels = new Map(choices.map((model) => [model.id, modelLabel(model)]));
	return (
		<Field.Root className="settings-row">
			<Field.Label>Agent model</Field.Label>
			<div className="settings-control">
				{choices.length === 0 ? (
					<p role="status">
						{models.some((model) => model.referenceToolsVerified === true)
							? "No models enabled. Expand a provider’s advanced settings to enable one."
							: "No models verified for reference tools yet."}
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
						value={
							choices.some((model) => model.id === selectedModel)
								? selectedModel
								: null
						}
						onValueChange={(value) => onModelChange(value ?? "")}
					>
						<Combobox.Input
							aria-label="Search tutor models"
							className="application-input"
							placeholder="Choose a model"
						/>
						<Combobox.Portal>
							<Combobox.Positioner className="settings-picker-positioner">
								<Combobox.Popup className="settings-picker-popup settings-model-popup">
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
