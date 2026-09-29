// ABOUTME: Renders the active sketch's editable description metadata and Markdown.
// ABOUTME: Keeps user-authored text separate from bundled trusted Markdown content.

import { Checkbox, Field } from "@base-ui/react";
import type { SketchDescription } from "@giclang/content/sketch-description";

export interface DescriptionPanelProps {
	readonly description: SketchDescription;
	readonly onChange: (description: SketchDescription) => void;
}

function parseList(value: string): string[] {
	return value === "" ? [] : value.split("\n");
}

export function DescriptionPanel({
	description,
	onChange,
}: DescriptionPanelProps) {
	const updateMetadata = (patch: Partial<SketchDescription["metadata"]>) => {
		onChange({
			...description,
			metadata: { ...description.metadata, ...patch },
		});
	};

	return (
		<section aria-label="Description" className="workspace-panel padded-panel">
			<div className="description-form">
				<Field.Root className="description-field">
					<Field.Label>title</Field.Label>
					<Field.Control
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
						aria-label="order"
						type="number"
						step="any"
						value={description.metadata.order}
						onChange={(event) => {
							const value = event.currentTarget.valueAsNumber;
							if (Number.isFinite(value)) updateMetadata({ order: value });
						}}
					/>
				</Field.Root>
				<label className="settings-option">
					<Checkbox.Root
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
