// ABOUTME: Renders settings and placeholder content for application-level tabs.
// ABOUTME: Keeps non-Code pages separate from the persistent IDE workspace.

import type { ChangeEvent } from "react";

export function SettingsView({
	formatOnSave,
	onFormatOnSaveChange,
	onResetLayout,
}: {
	formatOnSave: boolean;
	onFormatOnSaveChange: (checked: boolean) => void;
	onResetLayout: () => void;
}) {
	const handleFormatOnSaveChange = (event: ChangeEvent<HTMLInputElement>) => {
		onFormatOnSaveChange(event.target.checked);
	};

	return (
		<section aria-label="Settings" className="workspace-panel padded-panel">
			<h2>Workspace</h2>
			<label>
				<input
					checked={formatOnSave}
					type="checkbox"
					onChange={handleFormatOnSaveChange}
				/>
				Format on save
			</label>
			<button type="button" onClick={onResetLayout}>
				Reset Layout
			</button>
			<h2>Agent provider</h2>
			<p>
				Agent provider configuration is available in the desktop application
				when agent support is installed.
			</p>
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
						<button type="button" onClick={() => onOpen(name)}>
							{name}
						</button>
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
