// ABOUTME: Runs the shared GIC core inside a standalone HTML Blob worker.
// ABOUTME: Keeps standalone execution results identical to browser preview results.

import { runSource } from "../../src/core.ts";

self.onmessage = (event: MessageEvent<{ source: string }>) => {
	self.postMessage(runSource(event.data.source));
};
