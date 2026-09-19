<!-- ABOUTME: Records the completed standalone HTML export and its production acceptance evidence. -->
<!-- ABOUTME: Preserves artifact boundaries, runtime behavior, and final verification results. -->

# Standalone HTML export

- [decision] The browser build produces self-contained IIFE strings for the real GIC worker and shared Canvas renderer with Vite, then embeds them with the current source in one HTML artifact.
- [decision] The exported document uses a system monospace stack, a 100 by 100 Canvas, an editable textarea, diagnostics, and structured output without Monaco, storage, a Reset control, a bundled font, or network dependencies.
- [decision] The PWA Code-icon export is enabled only after the exact current source renders successfully and is invalidated immediately when that source changes or fails.
- [lesson] Failed interpreter runs retain structured output produced before the diagnostic. Standalone presentation must apply output before branching on run success, matching the core and shared PWA behavior.
- [technique] Standalone edits clear stale Canvas, diagnostics, and output immediately; a 100 ms debounce starts a disposable Blob worker, source replacement terminates it, and a 500 ms boundary terminates runaway execution.
- [verification] The exact generated artifact passed direct-`file://` drawing, ordered output, parse, analysis, runtime, replacement, timeout, recovery, and no-network acceptance in Chromium, Firefox, and WebKit.
- [verification] Firefox downloaded the exact generated template from the current successful PWA preview and kept the export disabled for stale or failing source.
- [verification] Locked install, core tests, compact core/browser tests, both typechecks, lint, formatting, browser build, the direct-file matrix, all 70 Firefox acceptance tests, and `git diff --check` passed.
