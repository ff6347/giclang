import { Button } from "@base-ui/react";
import type { ExampleContent } from "@giclang/content/model";
import { Markdown } from "./markdown.tsx";

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
					<li className="content-card" key={example.id}>
						<div className="content-card-content">
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
						</div>
					</li>
				))}
			</ul>
		</section>
	);
}
