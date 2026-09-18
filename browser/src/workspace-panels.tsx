// ABOUTME: Renders the editor, preview, status, and tutor workspace panels.
// ABOUTME: Adapts the existing Monaco lifecycle to React without a Monaco binding.

import { useEffect, useRef, useState, type RefObject } from "react";
import { Button } from "@base-ui/react/button";
import { createGicEditor, type GicEditor } from "./gic-editor.ts";

interface EditorPanelProps {
	onEditorReady: (editor: GicEditor | null) => void;
	onSave: () => void;
	onSourceChange: (source: string) => void;
	source: string;
}

export function EditorPanel({
	onEditorReady,
	onSave,
	onSourceChange,
	source,
}: EditorPanelProps) {
	const container = useRef<HTMLDivElement>(null);
	const editorRef = useRef<GicEditor | null>(null);
	const onEditorReadyRef = useRef(onEditorReady);
	const onSaveRef = useRef(onSave);
	const onSourceChangeRef = useRef(onSourceChange);
	onEditorReadyRef.current = onEditorReady;
	onSaveRef.current = onSave;
	onSourceChangeRef.current = onSourceChange;

	useEffect(() => {
		if (container.current === null) return;
		const editor = createGicEditor(
			container.current,
			(source) => onSourceChangeRef.current(source),
			() => onSaveRef.current(),
			source,
		);
		editorRef.current = editor;
		onEditorReadyRef.current(editor);
		return () => {
			onEditorReadyRef.current(null);
			editorRef.current = null;
			editor.dispose();
		};
	}, []);

	useEffect(() => {
		if (editorRef.current?.getValue() !== source)
			editorRef.current?.setValue(source);
	}, [source]);

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
		<section aria-label={label} className="workspace-panel padded-panel">
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
		"Complete agent setup in the desktop application, then retry.",
	);

	return (
		<section aria-label="Agent" className="workspace-panel padded-panel">
			<h2>Agent unavailable</h2>
			<p>The agent is optional. Editing and preview remain available.</p>
			<p aria-live="polite">{status}</p>
			<Button
				className="application-button"
				type="button"
				onClick={() =>
					setStatus("Agent is still unavailable. Complete setup, then retry.")
				}
			>
				Retry agent setup
			</Button>
		</section>
	);
}
