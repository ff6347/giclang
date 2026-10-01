<!-- ABOUTME: Records investigation and verification of the hex-color swatch regression. -->
<!-- ABOUTME: Captures the editor validation boundary and browser test outcome. -->

# Hex color swatches

- [lesson] Monaco's GIC color provider only decorates ranges returned by `apps/editor/src/lib/color-swatches.ts`; recognizing named colors alone omits the valid hex strings accepted by the drawing calls.
- [decision] Keep the existing complete, direct, single-argument color-string filter and recognize the four hex lengths accepted by the runtime alongside CSS names.
- [risk] On this machine the full Playwright run at its default eight workers aborted the Vite/Node server; the same 106-test suite completed with `--workers=1 --retries=0` (98 passed, 8 skipped).
- [technique] Pin both color source ranges in editor-local tests and visible Monaco swatch colors after typed edits in Firefox acceptance tests.
