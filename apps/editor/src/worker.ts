// ABOUTME: Runs the shared GIC source pipeline outside the browser main thread.
// ABOUTME: Returns serializable execution results to the preview controller.
import { runSource } from "@giclang/core";
self.onmessage = (event: MessageEvent<{ source: string }>) => {
	const { source } = event.data;

	// Heavy computation off the main thread

	// Send result back to main thread
	self.postMessage(runSource(source));
};
