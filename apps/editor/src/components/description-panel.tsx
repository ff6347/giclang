// ABOUTME: Renders the active sketch's editable description metadata and Markdown.
// ABOUTME: Keeps user-authored text separate from bundled trusted Markdown content.

import { Checkbox, Field } from "@base-ui/react";
import { useEffect, useState } from "react";
import type { SketchDescription } from "@giclang/content/sketch-description";

export interface DescriptionPanelProps {
	readonly description: SketchDescription;
	readonly onChange: (description: SketchDescription) => void;
	readonly desktop: boolean;
	readonly disabled: boolean;
}

function parseList(value: string): string[] {
	return value === "" ? [] : value.split("\n");
}

export function DescriptionPanel({
	description,
	onChange,
	desktop,
	disabled,
}: DescriptionPanelProps) {
	const [orderInput, setOrderInput] = useState({
		metadataOrder: description.metadata.order,
		value: String(description.metadata.order),
	});
	useEffect(() => {
		if (orderInput.metadataOrder !== description.metadata.order) {
			setOrderInput({
				metadataOrder: description.metadata.order,
				value: String(description.metadata.order),
			});
		}
	}, [description.metadata.order, orderInput.metadataOrder]);
	const updateMetadata = (patch: Partial<SketchDescription["metadata"]>) => {
		onChange({
			...description,
			metadata: { ...description.metadata, ...patch },
		});
	};

	return (
		<section aria-label="Description" className="workspace-panel padded-panel">
			<p>
				{desktop
					? "Populated descriptions are saved with the sketch on desktop."
					: "In the browser, descriptions are not saved with the source download."}
			</p>
			{description.body.trim() !== "" &&
				description.metadata.title.trim() === "" && (
					<p role="alert">
						Enter a title before saving a populated description.
					</p>
				)}
			<div className="description-form">
				<Field.Root className="description-field">
					<Field.Label>title</Field.Label>
					<Field.Control
						disabled={disabled}
						aria-label="title"
						required
						value={description.metadata.title}
						onChange={(event) =>
							updateMetadata({ title: event.currentTarget.value })
						}
					/>
				</Field.Root>
				<Field.Root className="description-field">
					<Field.Label>order</Field.Label>
					<Field.Control
						disabled={disabled}
						aria-label="order"
						type="number"
						step="any"
						value={orderInput.value}
						onChange={(event) => {
							const rawValue = event.currentTarget.value;
							const value = event.currentTarget.valueAsNumber;
							setOrderInput({
								metadataOrder: Number.isFinite(value)
									? value
									: description.metadata.order,
								value: rawValue,
							});
							if (Number.isFinite(value)) updateMetadata({ order: value });
						}}
					/>
				</Field.Root>
				<label className="settings-option">
					<Checkbox.Root
						disabled={disabled}
						aria-label="enabled"
						checked={description.metadata.enabled}
						className="settings-checkbox"
						onCheckedChange={(checked) =>
							updateMetadata({ enabled: checked === true })
						}
					>
						<Checkbox.Indicator className="settings-checkbox-indicator" />
					</Checkbox.Root>
					enabled
				</label>
				<Field.Root className="description-field">
					<Field.Label>categories</Field.Label>
					<textarea
						disabled={disabled}
						aria-label="categories"
						value={description.metadata.categories.join("\n")}
						onChange={(event) =>
							updateMetadata({
								categories: parseList(event.currentTarget.value),
							})
						}
					/>
				</Field.Root>
				<Field.Root className="description-field">
					<Field.Label>tags</Field.Label>
					<textarea
						disabled={disabled}
						aria-label="tags"
						value={description.metadata.tags.join("\n")}
						onChange={(event) =>
							updateMetadata({ tags: parseList(event.currentTarget.value) })
						}
					/>
				</Field.Root>
				<Field.Root className="description-field">
					<Field.Label>Markdown</Field.Label>
					<textarea
						disabled={disabled}
						aria-label="Markdown"
						className="description-markdown"
						value={description.body}
						onChange={(event) =>
							onChange({ ...description, body: event.currentTarget.value })
						}
					/>
				</Field.Root>
			</div>
		</section>
	);
}
