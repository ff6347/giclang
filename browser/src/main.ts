// ABOUTME: Runs the browser preview lifecycle and renders GIC commands to Canvas.
// ABOUTME: Manages worker replacement, console output, and visible diagnostics.
import Worker from "./worker.ts?worker";
import type { RunResult } from "../../src/core.ts";
import { clearCanvas, renderToCanvas } from "./render-to-canvas.ts";

document.addEventListener("DOMContentLoaded", () => {
	const TIMEOUT_IN_MS = 500;

	let activeWorker: Worker | null = null;
	let debounceTimer: number | null = null;

	// get dom elements
	const textarea: HTMLTextAreaElement | null =
		document.querySelector("textarea#code");
	const diagnostics: HTMLDivElement | null =
		document.querySelector("#diagnostics");
	const canvas: HTMLCanvasElement | null =
		document.querySelector("canvas#canvas");

	// defense against missing elements
	if (!textarea) throw new Error("textarea#code not found");
	if (!diagnostics) throw new Error("#diagnostics not found");
	if (!canvas) throw new Error("canvas#canvas not found");
	const canvasContext = canvas.getContext("2d");
	if (!canvasContext) throw new Error("canvas#canvas context not found");

	const runPreview = (source: string) => {
		let executionTimer: number | null = null;
		const worker = new Worker();
		activeWorker = worker;
		executionTimer = window.setTimeout(() => {
			if (worker !== activeWorker) return;
			worker.terminate();
			activeWorker = null;
			diagnostics.setHTML(
				`The preview took too long and was terminated after ${TIMEOUT_IN_MS}ms.`,
			);
			clearCanvas(canvasContext, canvas);
		}, TIMEOUT_IN_MS);
		worker.onerror = (error) => {
			if (worker !== activeWorker) return;
			if (executionTimer) clearTimeout(executionTimer);
			executionTimer = null;
			worker.terminate();
			activeWorker = null;

			console.error("Worker error:", error);
			diagnostics.setHTML("The preview could not be generated.");
			// clear canvas
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

			if (e.data.ok) {
				renderToCanvas(canvas, e.data.commands);
				console.info("Result:", e.data.commands);
				diagnostics.setHTML("");
				// write to canvas
			} else {
				clearCanvas(canvasContext, canvas);
				diagnostics.setHTML(
					e.data.diagnostics
						.map((d) => `<p>Line ${d.line + 1}: ${d.message}</p>`)
						.join("\n"),
				);
			}
		};
		worker.postMessage({ source });
	};

	const inputHandler = () => {
		if (debounceTimer) clearTimeout(debounceTimer);
		activeWorker?.terminate();
		activeWorker = null;
		debounceTimer = window.setTimeout(() => {
			runPreview(textarea.value);
		}, 100);
	};

	textarea.addEventListener("input", inputHandler);
});
