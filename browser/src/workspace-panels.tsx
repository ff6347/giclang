// ABOUTME: Renders the editor, preview, status, and tutor workspace panels.
// ABOUTME: Adapts the existing Monaco lifecycle to React without a Monaco binding.

import { useEffect, useRef, useState, type RefObject } from "react";
import { createGicEditor, type GicEditor } from "./gic-editor.ts";
import type { LanguageServiceSettings } from "../../src/language-service.ts";

interface EditorPanelProps {
	formatOnSave: boolean;
	initialSource: string;
	onEditorReady: (editor: GicEditor | null) => void;
	onSourceChange: (source: string) => void;
}

export function EditorPanel({
	formatOnSave,
	initialSource,
	onEditorReady,
	onSourceChange,
}: EditorPanelProps) {
	const container = useRef<HTMLDivElement>(null);
	const initialSourceRef = useRef(initialSource);
	const onEditorReadyRef = useRef(onEditorReady);
	const onSourceChangeRef = useRef(onSourceChange);
	const settingsRef = useRef<LanguageServiceSettings>({ formatOnSave });
	onEditorReadyRef.current = onEditorReady;
	onSourceChangeRef.current = onSourceChange;
	settingsRef.current = { formatOnSave };

	useEffect(() => {
		if (container.current === null) return;
		const editor = createGicEditor(
			container.current,
			(source) => onSourceChangeRef.current(source),
			() => settingsRef.current,
			initialSourceRef.current,
		);
		onEditorReadyRef.current(editor);
		return () => {
			onEditorReadyRef.current(null);
			editor.dispose();
		};
	}, []);

	return (
		<section aria-label="Editor" className="workspace-panel">
			<div id="code" ref={container}></div>
		</section>
	);
}

export function PreviewPanel({
	canvasRef,
}: {
	canvasRef: RefObject<HTMLCanvasElement | null>;
}) {
	useEffect(() => {
		canvasRef.current?.getContext("2d");
	}, [canvasRef]);

	return (
		<section aria-label="Preview" className="workspace-panel preview-panel">
			<canvas id="canvas" ref={canvasRef} width="100" height="100"></canvas>
		</section>
	);
}

function Entries({
	entries,
	id,
	label,
}: {
	entries: string[];
	id: string;
	label: string;
}) {
	return (
		<section aria-label={label} className="workspace-panel">
			<div id={id} aria-live="polite">
				{entries.map((entry, index) => (
					<p key={`${index}:${entry}`}>{entry}</p>
				))}
			</div>
		</section>
	);
}

export function ProblemsPanel({ entries }: { entries: string[] }) {
	return <Entries entries={entries} id="problems" label="Problems" />;
}

export function OutputPanel({ entries }: { entries: string[] }) {
	return <Entries entries={entries} id="output" label="Output" />;
}

export function TutorPanel() {
	const [status, setStatus] = useState(
		"Complete tutor setup in the desktop application, then retry.",
	);

	return (
		<section aria-label="Tutor" className="workspace-panel padded-panel">
			<h2>Tutor unavailable</h2>
			<p>The tutor is optional. Editing and preview remain available.</p>
			<p aria-live="polite">{status}</p>
			<button
				type="button"
				onClick={() =>
					setStatus("Tutor is still unavailable. Complete setup, then retry.")
				}
			>
				Retry tutor setup
			</button>
		</section>
	);
}
