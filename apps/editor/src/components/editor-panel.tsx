// ABOUTME: Renders the Monaco-backed GIC editor workspace panel.
// ABOUTME: Synchronizes source, save actions, and editor lifecycle with React.

import { useRef, useEffect } from "react";
import {
	type GicEditor,
	createGicEditor,
	setEditorTheme,
} from "../lib/gic-editor.ts";
import type { ResolvedTheme } from "../lib/theme.ts";

export interface EditorPanelProps {
	onEditorReady: (editor: GicEditor | null) => void;
	onSave: () => void;
	onRevealSketchFolder: (() => void) | undefined;
	onSourceChange: (source: string) => void;
	source: string;
	theme: ResolvedTheme;
}

export function EditorPanel({
	onEditorReady,
	onSave,
	onRevealSketchFolder,
	onSourceChange,
	source,
	theme,
}: EditorPanelProps) {
	const container = useRef<HTMLDivElement>(null);
	const editorRef = useRef<GicEditor | null>(null);
	const onEditorReadyRef = useRef(onEditorReady);
	const onSaveRef = useRef(onSave);
	const onRevealSketchFolderRef = useRef(onRevealSketchFolder);
	const onSourceChangeRef = useRef(onSourceChange);
	onEditorReadyRef.current = onEditorReady;
	onSaveRef.current = onSave;
	onRevealSketchFolderRef.current = onRevealSketchFolder;
	onSourceChangeRef.current = onSourceChange;

	useEffect(() => {
		if (container.current === null) return;
		const editor = createGicEditor(
			container.current,
			(source) => onSourceChangeRef.current(source),
			() => onSaveRef.current(),
			onRevealSketchFolderRef.current === undefined
				? undefined
				: () => onRevealSketchFolderRef.current?.(),
			theme,
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

	useEffect(() => {
		setEditorTheme(theme);
	}, [theme]);

	return (
		<section aria-label="Editor" className="workspace-panel">
			<div id="code" ref={container}></div>
		</section>
	);
}
