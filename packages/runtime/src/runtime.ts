// ABOUTME: Mounts independent editable GIC previews with disposable browser workers.
// ABOUTME: Owns debounce, cancellation, diagnostics, output, and component cleanup.

import type { RunResult } from "@giclang/core";
import { clearCanvas, renderToCanvas } from "./render-to-canvas.ts";
export { clearCanvas, renderToCanvas } from "./render-to-canvas.ts";

declare const GIC_WORKER_SOURCE: string;

export interface PreviewOptions {
	canvas: HTMLCanvasElement;
	input: HTMLInputElement | HTMLTextAreaElement;
	diagnostics: HTMLElement;
	output: HTMLElement;
	initialCode: string;
}

export function mountPreview({
	canvas,
	input,
	diagnostics,
	output,
	initialCode,
}: PreviewOptions): () => void {
	input.value = initialCode;

	let activeWorker: Worker | null = null;
	let debounceTimer: number | undefined;
	let executionTimer: number | undefined;
	const stop = () => {
		window.clearTimeout(executionTimer);
		activeWorker?.terminate();
		activeWorker = null;
	};
	const clear = () => {
		const context = canvas.getContext("2d");
		if (context) clearCanvas(context, canvas);
	};
	const run = () => {
		debounceTimer = undefined;
		const url = URL.createObjectURL(
			new Blob([GIC_WORKER_SOURCE], { type: "text/javascript" }),
		);
		const worker = new Worker(url);
		URL.revokeObjectURL(url);
		activeWorker = worker;
		executionTimer = window.setTimeout(() => {
			if (worker !== activeWorker) return;
			stop();
			clear();
			output.textContent = "";
			diagnostics.textContent = "The preview took too long and was terminated.";
		}, 500);
		worker.onmessage = ({ data }: MessageEvent<RunResult>) => {
			if (worker !== activeWorker) return;
			stop();
			output.textContent = data.output
				.map((entry) => `Line ${entry.line + 1}: ${entry.text}`)
				.join("\n");
			if (data.ok) {
				renderToCanvas(canvas, data.commands);
				diagnostics.textContent = "";
			} else {
				clear();
				diagnostics.textContent = data.diagnostics
					.map((entry) => `Line ${entry.line + 1}: ${entry.message}`)
					.join("\n");
			}
		};
		worker.onerror = (event) => {
			if (worker !== activeWorker) return;
			event.preventDefault();
			stop();
			clear();
			output.textContent = "";
			diagnostics.textContent = "The preview could not be generated.";
		};
		worker.postMessage({ source: input.value });
	};
	const schedule = () => {
		window.clearTimeout(debounceTimer);
		stop();
		clear();
		diagnostics.textContent = "";
		output.textContent = "";
		debounceTimer = window.setTimeout(run, 100);
	};

	input.addEventListener("input", schedule);
	run();
	return () => {
		input.removeEventListener("input", schedule);
		window.clearTimeout(debounceTimer);
		stop();
	};
}
