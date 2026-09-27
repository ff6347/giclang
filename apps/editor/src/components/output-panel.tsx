// ABOUTME: Renders structured print output in the Output workspace panel.
// ABOUTME: Delegates ordered entry presentation to the shared Entries component.

import { Entries } from "./entries.tsx";

export function OutputPanel({ entries }: { entries: string[] }) {
	return <Entries entries={entries} id="output" label="Output" />;
}
