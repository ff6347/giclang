<!-- ABOUTME: Records investigation and verification of the hex-color swatch regression. -->
<!-- ABOUTME: Captures the editor validation boundary and browser test outcome. -->

# Hex color swatches

- [lesson] Monaco's GIC color provider only decorates ranges returned by `apps/editor/src/lib/color-swatches.ts`; recognizing named colors alone omits the valid hex strings accepted by the drawing calls.
- [decision] Keep the existing complete, direct, single-argument color-string filter and recognize the four hex lengths accepted by the runtime alongside CSS names.
- [risk] On this machine the full Playwright run at its default eight workers aborted the Vite/Node server; the same 106-test suite completed with `--workers=1 --retries=0` (98 passed, 8 skipped).
- [technique] Pin both color source ranges in editor-local tests and visible Monaco swatch colors after typed edits in Firefox acceptance tests.
- [decision] Fabian specified editor hints for colors anywhere inside string literals, including two separate swatches for `tomato` and `#ff6347` in the same prose string. The color-argument filter above no longer applies to swatches; runtime validation is unchanged.
- [technique] Match whole alphanumeric/underscore/hash candidates inside quoted strings, then validate against the CSS name registry or GIC's supported hex lengths. Skip comments and unterminated strings without decorating partial words such as `reddish`.
- [lesson] The full 107-test Firefox browser suite passed with one worker (99 passed, 8 skipped), including the six-swatch prose example.
