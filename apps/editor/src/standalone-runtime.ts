// ABOUTME: Renders standalone GIC execution results inside an exported HTML document.
// ABOUTME: Preserves preview debounce, cancellation, diagnostics, and output behavior.

import { renderToCanvas, clearCanvas } from "./lib/render-to-canvas.ts";

export function startStandalonePreview(source: string, workerSource: string) {
	const editor = document.querySelector("textarea");
	const canvas = document.querySelector("canvas");
	const diagnostics = document.querySelector("#diagnostics");
	const output = document.querySelector("#output");
	if (
		!(editor instanceof HTMLTextAreaElement) ||
		!(canvas instanceof HTMLCanvasElement) ||
		!(diagnostics instanceof HTMLElement) ||
		!(output instanceof HTMLElement)
	) {
		throw new Error("Standalone preview elements are missing.");
	}

	let activeWorker: Worker | null = null;
	let timer: number | null = null;
	const clear = () => {
		const context = canvas.getContext("2d");
		if (context) clearCanvas(context, canvas);
	};
	const showOutput = (entries: { line: number; text: string }[]) => {
		output.textContent = entries
			.map((entry) => `Line ${entry.line + 1}: ${entry.text}`)
			.join("\n");
	};
	const run = (currentSource: string) => {
		const url = URL.createObjectURL(
			new Blob([workerSource], { type: "text/javascript" }),
		);
		const worker = new Worker(url);
		URL.revokeObjectURL(url);
		activeWorker = worker;
		const timeout = window.setTimeout(() => {
			if (worker !== activeWorker) return;
			worker.terminate();
			activeWorker = null;
			clear();
			output.textContent = "";
			diagnostics.textContent = "The preview took too long and was terminated.";
		}, 500);
		worker.onmessage = ({ data }) => {
			if (worker !== activeWorker) return;
			window.clearTimeout(timeout);
			worker.terminate();
			activeWorker = null;
			showOutput(data.output);
			if (data.ok) {
				renderToCanvas(canvas, data.commands);
				diagnostics.textContent = "";
				return;
			}
			clear();
			diagnostics.textContent = data.diagnostics
				.map(
					(diagnostic: { line: number; message: string }) =>
						`Line ${diagnostic.line + 1}: ${diagnostic.message}`,
				)
				.join("\n");
		};
		worker.postMessage({ source: currentSource });
	};
	const schedule = () => {
		if (timer !== null) window.clearTimeout(timer);
		activeWorker?.terminate();
		activeWorker = null;
		clear();
		diagnostics.textContent = "";
		output.textContent = "";
		timer = window.setTimeout(() => run(editor.value), 100);
	};
	editor.value = source;
	editor.addEventListener("input", schedule);
	run(source);
}
