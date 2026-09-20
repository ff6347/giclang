// ABOUTME: Renders ordered text entries inside a live workspace status panel.
// ABOUTME: Supplies the shared presentation used by Problems and Output.

export function Entries({
	entries,
	id,
	label,
}: {
	entries: string[];
	id: string;
	label: string;
}) {
	return (
		<section aria-label={label} className="workspace-panel padded-panel">
			<div id={id} aria-live="polite">
				{entries.map((entry, index) => (
					<p key={`${index}:${entry}`}>{entry}</p>
				))}
			</div>
		</section>
	);
}
