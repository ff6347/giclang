<!-- ABOUTME: Records the selected browser IDE technology and sandbox boundaries. -->
<!-- ABOUTME: Defines the textarea shell, worker isolation, preview lifecycle, and Firefox testing path. -->

# Decision: Browser IDE Technology and Sandbox Model

Status: Accepted for the vertical browser path

## Decision Question

Which browser editor or shell, preview isolation model, runtime scheduling boundary, dependency posture, and browser test harness will GIC use for the browser IDE? This decision does not decide language-service, LSP, or VS Code extension scope; it only defines the browser IDE technology and sandbox gate.

## Decision

- The first browser shell uses a plain `<textarea>`. This is a provisional input
  surface, not the final browser IDE editor.
- Preview execution runs in a dedicated Web Worker. The worker does not receive
  DOM or Canvas access; the main thread renders structured output to Canvas.
- GIC source is interpreted rather than evaluated as JavaScript, so the preview
  does not use an iframe.
- Source changes start a preview automatically after a short idle period. A new
  source change terminates and replaces any active worker.
- Worker termination is the cancellation seam. The browser also terminates work
  that exceeds an execution time limit so runaway programs cannot block the
  editing session.
- The previous image remains visible while the current source runs. Successful
  execution replaces it; diagnostics or an execution timeout clear it.
- Browser-facing failures use structured GIC diagnostics and never expose raw
  JavaScript stack traces.
- Playwright is the browser test harness, with Firefox as the required browser.
- The core remains free of DOM, Canvas, editor, worker, and browser test APIs.

Exact idle and execution limits, worker message shapes, build tooling, and the
final editor are implementation details or later decisions. They are not
selected here.

## Current Baseline

- [Memory](../MEMORY.md) records browser Canvas as the favored primary runtime direction while the TypeScript lexer, parser, analyzer, and interpreter remain platform-neutral.
- [Lessons](../LESSONS.md) places this decision before browser IDE implementation milestones.
- `ff6347/p5-code-sandbox` Monaco + iframe is a candidate only, not an adopted architecture.
- Relevant milestones:
  - [Define the browser-neutral core API and project structure](../milestones/browser-neutral-core-api.md)
  - [Add the browser Canvas backend for static sketches](../milestones/browser-canvas-static-backend.md)
  - [Add the browser Canvas animation backend](../milestones/browser-canvas-animation-backend.md)
  - [Build the browser IDE MVP with diagnostics and static preview](../milestones/browser-ide-mvp-diagnostics-static-preview.md)
  - [Add browser IDE animation and runtime-error UX](../milestones/browser-ide-animation-runtime-error-ux.md)
  - [Add browser IDE language assistance](../milestones/browser-ide-language-assistance.md)
- Relevant specification anchors:
  - [Implementation architecture](<../Language specification.md#implementation-architecture>)
  - [Render backends](<../Language specification.md#5-render-backends>)
  - [Live preview panel](<../Language specification.md#live-preview-panel>)
  - [Error message guidelines](<../Language specification.md#error-message-guidelines>)
  - [Testing strategy](<../Language specification.md#testing-strategy>)

## Why This Is a Gate

Browser IDE milestones cannot assume Monaco, iframe preview isolation, worker execution, bundler shape, direct in-process calls, or preview lifecycle. This decision must define stale preview behavior, runtime isolation, cancellation and restart model, and browser smoke expectations before those milestones depend on a platform shape.

## Considered Options

- Option: `Monaco + iframe adapted from ff6347/p5-code-sandbox`
  - Consequences: fast familiar IDE baseline; reuses an existing candidate; requires replacing the p5/JavaScript-eval path with the GIC core pipeline; requires iframe sandbox, CSP, postMessage, and error-handling boundaries; Monaco weight and accessibility need review.
- Option: `Monaco + worker/runtime boundary`
  - Consequences: isolates parsing, checking, and execution from the UI thread and supports cancellation; Canvas rendering may require command transfer or OffscreenCanvas; increases integration and debugging complexity.
- Option: `CodeMirror or lighter editor + direct browser core calls`
  - Consequences: smaller dependency surface; may be enough for beginner diagnostics; has less reuse from p5-code-sandbox; language assistance may require custom integration.
- Option: `Minimal textarea/editor shell first`
  - Consequences: lowest platform risk and clearest teaching surface; may under-deliver IDE expectations and require replacement later.

## Consequences and Deferred Details

- The textarea keeps the first browser shell small but intentionally defers
  IDE-quality editing features.
- Worker isolation adds one browser boundary immediately, but it provides hard
  cancellation for rapid automatic previews and future recursive or animated
  programs.
- Canvas remains a presentation adapter over structured output rather than a
  dependency of the language core.
- The exact automatic-preview timing and execution limit are selected when the
  behavior is implemented and tested.
- A final editor and broader browser matrix require separate evidence and are
  deferred.

## Decision Checklist

- Sandbox and isolation model documented.
- Preview lifecycle documented.
- Animation scheduling and cancellation documented.
- Core remains DOM-free and editor-free.
- Test and smoke strategy documented.
- Language-service compatibility noted but not selected here.

## Unblocks

- [Build the browser IDE MVP with diagnostics and static preview](../milestones/browser-ide-mvp-diagnostics-static-preview.md)
- [Add browser IDE animation and runtime-error UX](../milestones/browser-ide-animation-runtime-error-ux.md)
- [Add browser IDE language assistance](../milestones/browser-ide-language-assistance.md)
- Indirectly [Deno Desktop packaging](../milestones/deno-desktop-packaging.md)

## Related Guidance

- [Memory](../MEMORY.md)
- [Lessons](../LESSONS.md)
- [Implementation architecture](<../Language specification.md#implementation-architecture>)
- [Render backends](<../Language specification.md#5-render-backends>)
- [Live preview panel](<../Language specification.md#live-preview-panel>)
- [Error message guidelines](<../Language specification.md#error-message-guidelines>)
- [Testing strategy](<../Language specification.md#testing-strategy>)
- [ff6347/p5-code-sandbox](https://github.com/ff6347/p5-code-sandbox)

## Non-Goals

- Selecting LSP or VS Code extension scope.
- Selecting Deno Desktop.
- Selecting server rendering or export.
- Changing language grammar or runtime semantics.
