// ABOUTME: Presents bundled examples without changing the active sketch when copying.
// ABOUTME: Offers selectable source and clipboard feedback beside the existing load action.

import { useState } from "react";
import { Button } from "@base-ui/react";
import {
	createExampleCopyText,
	type ExampleContent,
} from "@giclang/content/model";
import { Markdown } from "./markdown.tsx";

function ExampleCard({
	example,
	onOpen,
}: {
	example: ExampleContent;
	onOpen: (id: string) => void;
}) {
	const [copying, setCopying] = useState(false);
	const [status, setStatus] = useState<"status" | "alert" | null>(null);

	async function copy() {
		setStatus(null);
		setCopying(true);
		try {
			await navigator.clipboard.writeText(createExampleCopyText(example));
			setStatus("status");
		} catch {
			setStatus("alert");
		} finally {
			setCopying(false);
		}
	}

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
					<Button
						className="application-button"
						type="button"
						disabled={copying}
						onClick={copy}
					>
						Copy to clipboard
					</Button>
					{status && (
						<p role={status}>
							{status === "status"
								? "Copied to clipboard."
								: "Could not copy to clipboard."}
						</p>
					)}
					<pre
						className="example-source"
						tabIndex={0}
						aria-label={`${example.title} source`}
					>
						<code>{example.source}</code>
					</pre>
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
