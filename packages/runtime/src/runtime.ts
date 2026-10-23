// ABOUTME: Mounts independent editable GIC previews with disposable browser workers.
// ABOUTME: Owns debounce, cancellation, diagnostics, output, and component cleanup.

import type { RunResult } from "@giclang/core";
import { clearCanvas, renderToCanvas } from "./render-to-canvas.ts";
export { clearCanvas, renderToCanvas } from "./render-to-canvas.ts";

declare const GIC_WORKER_SOURCE: string;

export function mountPreview(root: HTMLElement): () => void {
	const editor = root.querySelector("textarea");
	const canvas = root.querySelector("canvas");
	const diagnostics = root.querySelector<HTMLElement>("[data-gic-diagnostics]");
	const output = root.querySelector<HTMLElement>("[data-gic-output]");
	if (!editor || !canvas || !diagnostics || !output) {
		throw new Error("GIC preview elements are missing.");
	}

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
		worker.postMessage({ source: editor.value });
	};
	const schedule = () => {
		window.clearTimeout(debounceTimer);
		stop();
		clear();
		diagnostics.textContent = "";
		output.textContent = "";
		debounceTimer = window.setTimeout(run, 100);
	};

	editor.addEventListener("input", schedule);
	run();
	return () => {
		editor.removeEventListener("input", schedule);
		window.clearTimeout(debounceTimer);
		stop();
	};
}

export function registerSketchElement(): void {
	if (customElements.get("gic-sketch")) return;
	customElements.define(
		"gic-sketch",
		class extends HTMLElement {
			private dispose: (() => void) | undefined;

			connectedCallback() {
				this.dispose = mountPreview(this);
			}

			disconnectedCallback() {
				this.dispose?.();
			}
		},
	);
}
