<!-- ABOUTME: Defines the unresolved browser IDE technology and sandbox decision gate. -->
<!-- ABOUTME: Compares editor, preview, scheduling, and browser isolation options without selecting one. -->

# Decision: Browser IDE Technology and Sandbox Model

Status: Unresolved

## Decision Question

Which browser editor or shell, preview isolation model, runtime scheduling boundary, dependency posture, and browser test harness will GIC use for the browser IDE? This decision does not decide language-service, LSP, or VS Code extension scope; it only defines the browser IDE technology and sandbox gate.

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
  - [Implementation architecture](<../Language specification rev 2.1.md#implementation-architecture>)
  - [Render backends](<../Language specification rev 2.1.md#5-render-backends>)
  - [Live preview panel](<../Language specification rev 2.1.md#live-preview-panel>)
  - [Error message guidelines](<../Language specification rev 2.1.md#error-message-guidelines>)
  - [Testing strategy](<../Language specification rev 2.1.md#testing-strategy>)

## Why This Is a Gate

Browser IDE milestones cannot assume Monaco, iframe preview isolation, worker execution, bundler shape, direct in-process calls, or preview lifecycle. This decision must define stale preview behavior, runtime isolation, cancellation and restart model, and browser smoke expectations before those milestones depend on a platform shape.

## Options and Consequences

- Option: `Monaco + iframe adapted from ff6347/p5-code-sandbox`
  - Consequences: fast familiar IDE baseline; reuses an existing candidate; requires replacing the p5/JavaScript-eval path with the GIC core pipeline; requires iframe sandbox, CSP, postMessage, and error-handling boundaries; Monaco weight and accessibility need review.
- Option: `Monaco + worker/runtime boundary`
  - Consequences: isolates parsing, checking, and execution from the UI thread and supports cancellation; Canvas rendering may require command transfer or OffscreenCanvas; increases integration and debugging complexity.
- Option: `CodeMirror or lighter editor + direct browser core calls`
  - Consequences: smaller dependency surface; may be enough for beginner diagnostics; has less reuse from p5-code-sandbox; language assistance may require custom integration.
- Option: `Minimal textarea/editor shell first`
  - Consequences: lowest platform risk and clearest teaching surface; may under-deliver IDE expectations and require replacement later.

## Questions Before Choosing

- What editor features are required for the MVP?
- Is iframe isolation required for interpreted GIC?
- Does execution run in a worker or on the main thread?
- How are runaway programs stopped?
- How are runtime errors shown without raw stack traces?
- What browser test harness is acceptable?

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
- [Implementation architecture](<../Language specification rev 2.1.md#implementation-architecture>)
- [Render backends](<../Language specification rev 2.1.md#5-render-backends>)
- [Live preview panel](<../Language specification rev 2.1.md#live-preview-panel>)
- [Error message guidelines](<../Language specification rev 2.1.md#error-message-guidelines>)
- [Testing strategy](<../Language specification rev 2.1.md#testing-strategy>)
- [ff6347/p5-code-sandbox](https://github.com/ff6347/p5-code-sandbox)

## Non-Goals

- Selecting LSP or VS Code extension scope.
- Selecting Deno Desktop.
- Selecting server rendering or export.
- Changing language grammar or runtime semantics.
