// ABOUTME: Renders diagnostics in the Problems workspace panel.
// ABOUTME: Delegates ordered entry presentation to the shared Entries component.

import { Entries } from "./entries.tsx";

export function ProblemsPanel({ entries }: { entries: string[] }) {
	return <Entries entries={entries} id="problems" label="Problems" />;
}
