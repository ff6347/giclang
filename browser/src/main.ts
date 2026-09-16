// ABOUTME: Runs the browser authoring lifecycle and renders GIC commands to Canvas.
// ABOUTME: Manages Monaco changes, worker replacement, output, and diagnostics.
import Worker from "./worker.ts?worker";
import type { RunResult } from "../../src/core.ts";
import { createGicEditor, setEditorDiagnostics } from "./gic-editor.ts";
import { clearCanvas, renderToCanvas } from "./render-to-canvas.ts";
import "./styles.css";

document.addEventListener("DOMContentLoaded", () => {
	const TIMEOUT_IN_MS = 500;
	const FORMAT_ON_SAVE_STORAGE_KEY = "gic.formatOnSave";

	let activeWorker: Worker | null = null;
	let debounceTimer: number | null = null;

	const editorContainer: HTMLDivElement | null =
		document.querySelector("#code");
	const problems: HTMLDivElement | null = document.querySelector("#problems");
	const output: HTMLDivElement | null = document.querySelector("#output");
	const formatOnSave: HTMLInputElement | null =
		document.querySelector("#format-on-save");
	const canvas: HTMLCanvasElement | null =
		document.querySelector("canvas#canvas");

	if (!editorContainer) throw new Error("#code not found");
	if (!problems) throw new Error("#problems not found");
	if (!output) throw new Error("#output not found");
	if (!formatOnSave) throw new Error("#format-on-save not found");
	if (!canvas) throw new Error("canvas#canvas not found");
	const canvasContext = canvas.getContext("2d");
	if (!canvasContext) throw new Error("canvas#canvas context not found");

	const renderEntries = (element: HTMLElement, entries: string[]) => {
		element.replaceChildren(
			...entries.map((entry) => {
				const paragraph = document.createElement("p");
				paragraph.textContent = entry;
				return paragraph;
			}),
		);
	};

	formatOnSave.checked =
		localStorage.getItem(FORMAT_ON_SAVE_STORAGE_KEY) !== "false";
	formatOnSave.addEventListener("change", () => {
		localStorage.setItem(
			FORMAT_ON_SAVE_STORAGE_KEY,
			String(formatOnSave.checked),
		);
	});

	let editor: ReturnType<typeof createGicEditor>;

	const runPreview = (source: string) => {
		let executionTimer: number | null = null;
		const worker = new Worker();
		activeWorker = worker;
		executionTimer = window.setTimeout(() => {
			if (worker !== activeWorker) return;
			worker.terminate();
			activeWorker = null;
			setEditorDiagnostics(editor, []);
			renderEntries(problems, [
				`The preview took too long and was terminated after ${TIMEOUT_IN_MS}ms.`,
			]);
			clearCanvas(canvasContext, canvas);
		}, TIMEOUT_IN_MS);
		worker.onerror = (error) => {
			if (worker !== activeWorker) return;
			if (executionTimer) clearTimeout(executionTimer);
			executionTimer = null;
			worker.terminate();
			activeWorker = null;

			console.error("Worker error:", error);
			setEditorDiagnostics(editor, []);
			renderEntries(problems, ["The preview could not be generated."]);
			clearCanvas(canvasContext, canvas);
		};

		worker.onmessage = (e: MessageEvent<RunResult>) => {
			if (worker !== activeWorker) return;
			if (executionTimer) clearTimeout(executionTimer);
			executionTimer = null;
			worker.terminate();
			activeWorker = null;

			for (const entry of e.data.output) {
				console.info(`Line ${entry.line + 1}: ${entry.text}`);
			}
			renderEntries(
				output,
				e.data.output.map((entry) => `Line ${entry.line + 1}: ${entry.text}`),
			);

			if (e.data.ok) {
				renderToCanvas(canvas, e.data.commands);
				console.info("Result:", e.data.commands);
				setEditorDiagnostics(editor, []);
				renderEntries(problems, []);
			} else {
				clearCanvas(canvasContext, canvas);
				renderEntries(
					problems,
					setEditorDiagnostics(editor, e.data.diagnostics),
				);
			}
		};
		worker.postMessage({ source });
	};

	const inputHandler = (source: string) => {
		if (debounceTimer) clearTimeout(debounceTimer);
		activeWorker?.terminate();
		activeWorker = null;
		setEditorDiagnostics(editor, []);
		renderEntries(problems, []);
		renderEntries(output, []);
		debounceTimer = window.setTimeout(() => {
			runPreview(source);
		}, 100);
	};

	editor = createGicEditor(editorContainer, inputHandler, () => ({
		formatOnSave: formatOnSave.checked,
	}));
});
