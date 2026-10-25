// ABOUTME: Runs the shared GIC core inside a disposable browser worker.
// ABOUTME: Returns structured commands, output, and diagnostics to preview hosts.

import { runSource } from "@giclang/core";

self.onmessage = (event: MessageEvent<{ source: string }>) => {
	self.postMessage(runSource(event.data.source));
};
