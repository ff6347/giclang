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
import { capturePreviewPng } from "../lib/preview-capture.ts";
import { PreviewSource } from "../lib/preview-source.ts";

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
	const renderedSource = useRef<string | undefined>(undefined);
	const previewSource = useRef(new PreviewSource()).current;
	const debounceRun = useRef<number | undefined>(undefined);
	const activeWorkerRun = useRef<number | undefined>(undefined);

	const clearCurrentCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		const context = canvas?.getContext("2d");
		if (canvas && context) {
			clearCanvas(context, canvas);
		}
	}, [canvasRef]);

	const runPreview = useCallback(
		(source: string, run: number) => {
			let executionTimer: number | null = null;
			const worker = new Worker();
			activeWorker.current = worker;
			activeWorkerRun.current = run;
			executionTimer = window.setTimeout(() => {
				if (worker !== activeWorker.current) return;
				worker.terminate();
				activeWorker.current = null;
				activeWorkerRun.current = undefined;
				previewSource.fail(run);
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
				renderedSource.current = undefined;
				clearCurrentCanvas();
			}, TIMEOUT_IN_MS);

			worker.onerror = (error) => {
				if (worker !== activeWorker.current) return;
				if (executionTimer !== null) clearTimeout(executionTimer);
				worker.terminate();
				activeWorker.current = null;
				activeWorkerRun.current = undefined;
				previewSource.fail(run);

				renderedSource.current = undefined;
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
				activeWorkerRun.current = undefined;
				if (!previewSource.isPending(run, source)) return;

				const output = event.data.output.map(
					(entry) => `Line ${entry.line + 1}: ${entry.text}`,
				);
				for (const entry of output) {
					console.info(entry);
				}

				if (event.data.ok) {
					previewSource.accept(run, source);
					const canvas = canvasRef.current;
					if (canvas) {
						renderToCanvas(canvas, event.data.commands);
					}
					renderedSource.current = canvas === null ? undefined : source;
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

				previewSource.fail(run);
				renderedSource.current = undefined;
				clearCurrentCanvas();
				const problems = editor.current
					? setEditorDiagnostics(editor.current, event.data.diagnostics)
					: event.data.diagnostics.map(({ message }) => message);
				setState({ isCurrentSourceRendered: false, output, problems });
			};
			worker.postMessage({ source });
		},
		[canvasRef, clearCurrentCanvas, previewSource],
	);

	const onSourceChange = useCallback(
		(source: string) => {
			if (debounceTimer.current !== null) {
				clearTimeout(debounceTimer.current);
			}
			activeWorker.current?.terminate();
			activeWorker.current = null;
			activeWorkerRun.current = undefined;
			if (editor.current) {
				setEditorDiagnostics(editor.current, []);
			}
			renderedSource.current = undefined;
			const run = previewSource.begin(source);
			setState({ isCurrentSourceRendered: false, output: [], problems: [] });
			debounceRun.current = run;
			debounceTimer.current = window.setTimeout(() => {
				debounceTimer.current = null;
				debounceRun.current = undefined;
				runPreview(source, run);
			}, 100);
		},
		[runPreview, previewSource],
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

	const captureThumbnail = useCallback(
		(source: string) =>
			capturePreviewPng(canvasRef.current, renderedSource.current, source),
		[canvasRef],
	);

	const adoptSavedSource = useCallback(
		(sourceBefore: string, sourceAdopted: string) => {
			const adoption = previewSource.adoptSavedSource(
				sourceBefore,
				sourceAdopted,
			);
			if (adoption.invalidatedRun !== undefined) {
				if (debounceRun.current === adoption.invalidatedRun) {
					if (debounceTimer.current !== null) {
						clearTimeout(debounceTimer.current);
						debounceTimer.current = null;
					}
					debounceRun.current = undefined;
				}
				if (activeWorkerRun.current === adoption.invalidatedRun) {
					activeWorker.current?.terminate();
					activeWorker.current = null;
					activeWorkerRun.current = undefined;
				}
			}
			if (adoption.accepted) renderedSource.current = sourceAdopted;
		},
		[previewSource],
	);

	return {
		adoptSavedSource,
		captureThumbnail,
		onSourceChange,
		setEditor,
		state,
	};
}
