// ABOUTME: Presents bundled examples without changing the active sketch when copying.
// ABOUTME: Offers transient in-button clipboard confirmation beside the existing load action.

import { Button } from "@base-ui/react";
import {
	createExampleCopyText,
	type ExampleContent,
} from "@giclang/content/model";
import { CopyButton } from "./copy-button.tsx";
import { Markdown } from "./markdown.tsx";

function ExampleCard({
	example,
	onOpen,
}: {
	example: ExampleContent;
	onOpen: (id: string) => void;
}) {
	return (
		<li className="content-card">
			<div className="content-card-content">
				<img
					alt={`${example.title} thumbnail`}
					className="example-thumbnail"
					height="100"
					src={example.thumbnailUrl}
					width="100"
				/>
				<div className="example-card-body">
					<h3>{example.title}</h3>
					<Markdown content={example} />
					<Button
						className="application-button"
						type="button"
						onClick={() => onOpen(example.id)}
					>
						Load this example
					</Button>
					<CopyButton
						text={createExampleCopyText(example)}
						label="Copy to clipboard"
					/>
				</div>
			</div>
		</li>
	);
}

export function ExamplesPanel({
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
					<ExampleCard key={example.id} example={example} onOpen={onOpen} />
				))}
			</ul>
		</section>
	);
}
