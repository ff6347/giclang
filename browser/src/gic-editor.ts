// ABOUTME: Creates the Monaco source editor and registers GIC language highlighting.
// ABOUTME: Converts GIC diagnostic offsets into Monaco markers and problem text.

import * as monaco from "monaco-editor/editor/editor.api.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import type { Diagnostic } from "../../src/core.ts";
import { builtIns } from "../../src/built-ins.ts";
import { keywords } from "../../src/keywords.ts";

globalThis.MonacoEnvironment = {
	getWorker() {
		return new EditorWorker();
	},
};

const LANGUAGE_ID = "gic";
const MARKER_OWNER = "gic";

export type GicEditor = monaco.editor.IStandaloneCodeEditor;

function registerGicLanguage() {
	if (monaco.languages.getLanguages().some(({ id }) => id === LANGUAGE_ID)) {
		return;
	}

	monaco.languages.register({ id: LANGUAGE_ID });
	monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, {
		builtIns: Object.keys(builtIns),
		keywords: Object.keys(keywords),
		tokenizer: {
			root: [
				[
					/[a-zA-Z_]\w*/,
					{
						cases: {
							"@builtIns": "type.identifier",
							"@keywords": "keyword",
							"@default": "identifier",
						},
					},
				],
				[/\d+(?:\.\d+)?/, "number"],
				[/"[^"\n]*"/, "string"],
				[/\/\/.*$/, "comment"],
				[/[{}()[\]]/, "@brackets"],
				[/[+\-*/%<>=!&|]+/, "operator"],
				[/[;,]/, "delimiter"],
			],
		},
	});
}

export function createGicEditor(
	container: HTMLElement,
	onSourceChange: (source: string) => void,
): GicEditor {
	registerGicLanguage();
	const editor = monaco.editor.create(container, {
		theme: "vs",
		ariaLabel: "GiC",
		automaticLayout: true,
		language: LANGUAGE_ID,
		minimap: { enabled: false },
		scrollBeyondLastLine: false,
		detectIndentation: true,
		wordBasedSuggestions: "currentDocument",
		colorDecorators: true,
		value: "",
		lineNumbers: "on",
		formatOnPaste: true,
		fontFamily: "IBM Plex Mono, monospace",
		fontSize: 18,
		tabSize: 2,
		insertSpaces: false,
		rulers: [50],
		accessibilitySupport: "on",
		roundedSelection: false,
		cursorStyle: "line",
		fontLigatures: false,
		cursorBlinking: "blink",
	});
	editor.onDidChangeModelContent(() => {
		onSourceChange(editor.getValue());
	});
	return editor;
}

export function setEditorDiagnostics(
	editor: GicEditor,
	diagnostics: Diagnostic[],
): string[] {
	const model = editor.getModel();
	if (model === null) {
		return [];
	}

	const problems = diagnostics.map((diagnostic) => {
		const start = model.getPositionAt(diagnostic.start);
		const end = model.getPositionAt(diagnostic.end);
		return {
			marker: {
				endColumn: end.column,
				endLineNumber: end.lineNumber,
				message: diagnostic.message,
				severity: monaco.MarkerSeverity.Error,
				startColumn: start.column,
				startLineNumber: start.lineNumber,
			},
			text: `Line ${start.lineNumber}, columns ${start.column}–${end.column}: ${diagnostic.message}`,
		};
	});

	monaco.editor.setModelMarkers(
		model,
		MARKER_OWNER,
		problems.map(({ marker }) => marker),
	);
	return problems.map(({ text }) => text);
}
