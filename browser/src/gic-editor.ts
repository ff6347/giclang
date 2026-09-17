// ABOUTME: Creates the Monaco source editor and registers GIC language highlighting.
// ABOUTME: Converts GIC diagnostic offsets into Monaco markers and problem text.

import * as monaco from "monaco-editor/editor/editor.api.js";
import "monaco-editor/features/register.all.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import type { Diagnostic } from "../../src/core.ts";
import { builtIns } from "../../src/built-ins.ts";
import {
	completeSource,
	formatSourceDocument,
	hoverSource,
	signatureHelpSource,
} from "../../src/language-service.ts";
import { keywords } from "../../src/keywords.ts";

globalThis.MonacoEnvironment = {
	getWorker() {
		return new EditorWorker();
	},
};

const LANGUAGE_ID = "gic";
const MARKER_OWNER = "gic";

export type GicEditor = monaco.editor.IStandaloneCodeEditor;

function completionKind(
	kind: "constant" | "function" | "keyword" | "user-function" | "variable",
): monaco.languages.CompletionItemKind {
	switch (kind) {
		case "constant":
			return monaco.languages.CompletionItemKind.Constant;
		case "function":
		case "user-function":
			return monaco.languages.CompletionItemKind.Function;
		case "keyword":
			return monaco.languages.CompletionItemKind.Keyword;
		case "variable":
			return monaco.languages.CompletionItemKind.Variable;
	}
}

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
	monaco.languages.registerDocumentFormattingEditProvider(LANGUAGE_ID, {
		provideDocumentFormattingEdits(model) {
			const source = model.getValue();
			const formattedSource = formatSourceDocument(source);
			if (formattedSource === source) {
				return [];
			}
			return [
				{
					range: model.getFullModelRange(),
					text: formattedSource,
				},
			];
		},
	});
	monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
		provideCompletionItems(model, position) {
			const suggestions = completeSource(
				model.getValue(),
				model.getOffsetAt(position),
			).map((completion) => {
				const start = model.getPositionAt(completion.replacement.start);
				const end = model.getPositionAt(completion.replacement.end);
				return {
					insertText: completion.label,
					kind: completionKind(completion.kind),
					label: completion.label,
					range: new monaco.Range(
						start.lineNumber,
						start.column,
						end.lineNumber,
						end.column,
					),
					...(completion.documentation === undefined
						? {}
						: { documentation: completion.documentation }),
					...(completion.signature === undefined
						? {}
						: { detail: completion.signature }),
				};
			});
			return { suggestions };
		},
	});
	monaco.languages.registerHoverProvider(LANGUAGE_ID, {
		provideHover(model, position) {
			const hover = hoverSource(model.getValue(), model.getOffsetAt(position));
			if (hover === undefined) {
				return undefined;
			}
			const start = model.getPositionAt(hover.range.start);
			const end = model.getPositionAt(hover.range.end);
			return {
				contents: hover.contents.map((value) => ({ value })),
				range: new monaco.Range(
					start.lineNumber,
					start.column,
					end.lineNumber,
					end.column,
				),
			};
		},
	});
	monaco.languages.registerSignatureHelpProvider(LANGUAGE_ID, {
		signatureHelpTriggerCharacters: ["(", ","],
		provideSignatureHelp(model, position) {
			const help = signatureHelpSource(
				model.getValue(),
				model.getOffsetAt(position),
			);
			if (help === undefined) {
				return undefined;
			}
			return {
				dispose() {},
				value: {
					activeParameter: help.activeParameter,
					activeSignature: help.activeSignature,
					signatures: help.signatures.map((signature) => {
						return {
							label: signature.label,
							parameters: signature.parameters.map(({ label }) => ({ label })),
							...(signature.documentation === undefined
								? {}
								: { documentation: signature.documentation }),
						};
					}),
				},
			};
		},
	});
}

export function createGicEditor(
	container: HTMLElement,
	onSourceChange: (source: string) => void,
	onSave: () => void,
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
		wordBasedSuggestions: "off",
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
	editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
		onSave();
	});
	editor.focus();
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
