// ABOUTME: Renders settings and bundled content for application-level tabs.
// ABOUTME: Keeps non-Code pages separate from the persistent IDE workspace.

import { Button } from "@base-ui/react/button";
import { Checkbox } from "@base-ui/react/checkbox";
import type {
	DocumentationContent,
	ExampleContent,
	MarkdownContent,
} from "../lib/content-model.ts";

export function SettingsView({
	canvasFrame,
	formatOnSave,
	onCanvasFrameChange,
	onFormatOnSaveChange,
	onResetLayout,
}: {
	canvasFrame: boolean;
	formatOnSave: boolean;
	onCanvasFrameChange: (checked: boolean) => void;
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
		</section>
	);
}

export function ExamplesView({
	examples,
	onOpen,
}: {
	examples: ExampleContent[];
	onOpen: (id: string) => void;
}) {
	return (
		<section className="workspace-panel padded-panel">
			<h2>Examples</h2>
			<ul className="content-card-list">
				{examples.map((example) => (
					<li className="content-card" key={example.id}>
						<img
							alt={`${example.title} thumbnail`}
							className="example-thumbnail"
							height="100"
							src={example.thumbnailUrl}
							width="100"
						/>
						<div>
							<h3>{example.title}</h3>
							<Markdown content={example} />
							<Button
								className="application-button"
								type="button"
								onClick={() => onOpen(example.id)}
							>
								Load this example
							</Button>
						</div>
					</li>
				))}
			</ul>
		</section>
	);
}

export function DocsView({ docs }: { docs: DocumentationContent[] }) {
	return (
		<article
			aria-label="Docs"
			className="workspace-panel padded-panel content-document"
		>
			{docs.map((doc) => (
				<section key={doc.id}>
					<h2>{doc.title}</h2>
					<Markdown content={doc} />
				</section>
			))}
		</article>
	);
}

export function AboutView({ content }: { content: MarkdownContent }) {
	return (
		<section className="workspace-panel padded-panel">
			<h2>{content.title}</h2>
			<Markdown content={content} />
		</section>
	);
}

function Markdown({ content }: { content: MarkdownContent }) {
	return (
		<div
			className="content-markdown"
			dangerouslySetInnerHTML={{ __html: content.html }}
		/>
	);
}
