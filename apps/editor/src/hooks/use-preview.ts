// ABOUTME: Runs disposable preview workers and exposes render-ready browser state.
// ABOUTME: Keeps worker cancellation, diagnostics, output, and Canvas updates together.

import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type RefObject,
} from "react";
import Worker from "../worker.ts?worker";
import type { RunResult } from "@giclang/core";
import { setEditorDiagnostics, type GicEditor } from "../lib/gic-editor.ts";
import { clearCanvas, renderToCanvas } from "../lib/render-to-canvas.ts";

const TIMEOUT_IN_MS = 500;

export interface PreviewState {
	isCurrentSourceRendered: boolean;
	output: string[];
	problems: string[];
}

export function usePreview(canvasRef: RefObject<HTMLCanvasElement | null>) {
	const [state, setState] = useState<PreviewState>({
		isCurrentSourceRendered: false,
		output: [],
		problems: [],
	});
	const activeWorker = useRef<Worker | null>(null);
	const debounceTimer = useRef<number | null>(null);
	const editor = useRef<GicEditor | null>(null);

	const clearCurrentCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		const context = canvas?.getContext("2d");
		if (canvas && context) {
			clearCanvas(context, canvas);
		}
	}, [canvasRef]);

	const runPreview = useCallback(
		(source: string) => {
			let executionTimer: number | null = null;
			const worker = new Worker();
			activeWorker.current = worker;
			executionTimer = window.setTimeout(() => {
				if (worker !== activeWorker.current) return;
				worker.terminate();
				activeWorker.current = null;
				if (editor.current) {
					setEditorDiagnostics(editor.current, []);
				}
				setState({
					isCurrentSourceRendered: false,
					output: [],
					problems: [
						`The preview took too long and was terminated after ${TIMEOUT_IN_MS}ms.`,
					],
				});
				clearCurrentCanvas();
			}, TIMEOUT_IN_MS);

			worker.onerror = (error) => {
				if (worker !== activeWorker.current) return;
				if (executionTimer !== null) clearTimeout(executionTimer);
				worker.terminate();
				activeWorker.current = null;

				console.error("Worker error:", error);
				if (editor.current) {
					setEditorDiagnostics(editor.current, []);
				}
				setState({
					isCurrentSourceRendered: false,
					output: [],
					problems: ["The preview could not be generated."],
				});
				clearCurrentCanvas();
			};

			worker.onmessage = (event: MessageEvent<RunResult>) => {
				if (worker !== activeWorker.current) return;
				if (executionTimer !== null) clearTimeout(executionTimer);
				worker.terminate();
				activeWorker.current = null;

				const output = event.data.output.map(
					(entry) => `Line ${entry.line + 1}: ${entry.text}`,
				);
				for (const entry of output) {
					console.info(entry);
				}

				if (event.data.ok) {
					const canvas = canvasRef.current;
					if (canvas) {
						renderToCanvas(canvas, event.data.commands);
					}
					console.info("Result:", event.data.commands);
					if (editor.current) {
						setEditorDiagnostics(editor.current, []);
					}
					setState({
						isCurrentSourceRendered: canvas !== null,
						output,
						problems: [],
					});
					return;
				}

				clearCurrentCanvas();
				const problems = editor.current
					? setEditorDiagnostics(editor.current, event.data.diagnostics)
					: event.data.diagnostics.map(({ message }) => message);
				setState({ isCurrentSourceRendered: false, output, problems });
			};
			worker.postMessage({ source });
		},
		[canvasRef, clearCurrentCanvas],
	);

	const onSourceChange = useCallback(
		(source: string) => {
			if (debounceTimer.current !== null) {
				clearTimeout(debounceTimer.current);
			}
			activeWorker.current?.terminate();
			activeWorker.current = null;
			if (editor.current) {
				setEditorDiagnostics(editor.current, []);
			}
			setState({ isCurrentSourceRendered: false, output: [], problems: [] });
			debounceTimer.current = window.setTimeout(() => {
				runPreview(source);
			}, 100);
		},
		[runPreview],
	);

	const setEditor = useCallback((nextEditor: GicEditor | null) => {
		editor.current = nextEditor;
	}, []);

	useEffect(() => {
		return () => {
			if (debounceTimer.current !== null) {
				clearTimeout(debounceTimer.current);
			}
			activeWorker.current?.terminate();
		};
	}, []);

	return { onSourceChange, setEditor, state };
}
