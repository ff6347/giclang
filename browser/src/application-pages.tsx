// ABOUTME: Renders settings and placeholder content for application-level tabs.
// ABOUTME: Keeps non-Code pages separate from the persistent IDE workspace.

import { Button } from "@base-ui/react/button";
import { Checkbox } from "@base-ui/react/checkbox";

export function SettingsView({
	formatOnSave,
	onFormatOnSaveChange,
	onResetLayout,
}: {
	formatOnSave: boolean;
	onFormatOnSaveChange: (checked: boolean) => void;
	onResetLayout: () => void;
}) {
	return (
		<section aria-label="Settings" className="workspace-panel padded-panel">
			<h2>Workspace</h2>
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

export function ExamplesView({
	examples,
	onOpen,
}: {
	examples: string[];
	onOpen: (name: string) => void;
}) {
	return (
		<section className="workspace-panel padded-panel">
			<h2>Examples</h2>
			<ul>
				{examples.map((name) => (
					<li key={name}>
						<Button
							className="application-button"
							type="button"
							onClick={() => onOpen(name)}
						>
							{name}
						</Button>
					</li>
				))}
			</ul>
		</section>
	);
}

export function DocsView() {
	return (
		<section className="workspace-panel padded-panel">
			<h2>Docs</h2>
			<p>Language reference and help for writing GIC programs.</p>
		</section>
	);
}

export function AboutView() {
	return (
		<section className="workspace-panel padded-panel">
			<h2>About</h2>
			<p>
				Gestalten in Code is a small C-style language for creating
				two-dimensional generative graphics and teaching programming
				fundamentals.
			</p>
		</section>
	);
}
