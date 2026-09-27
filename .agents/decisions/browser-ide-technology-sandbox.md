<!-- ABOUTME: Records the selected shared IDE editor and browser sandbox boundaries. -->
<!-- ABOUTME: Defines Monaco integration, worker isolation, preview lifecycle, and browser tests. -->

# Decision: Browser IDE Technology and Sandbox Model

Status: Accepted for v0.9

## Decision Question

Which editor, preview isolation model, runtime scheduling boundary, dependency posture, and browser test harness will GIC use for the shared desktop/PWA IDE?

## Decision

- Monaco is the v0.9 editor. The existing `<textarea>` is only the completed prototype surface and will be replaced.
- Desktop and PWA editions reuse one browser UI rather than forking editor or preview behavior.
- Preview execution runs in a dedicated Web Worker. The worker receives no DOM or Canvas access; the UI thread renders plain structured output.
- GIC source is interpreted rather than evaluated as JavaScript, so preview isolation does not require an iframe.
- Source changes start preview 100 ms after typing stops. A newer source change terminates and replaces the active worker.
- Worker termination is the cancellation seam. A run that exceeds the execution limit is also terminated so runaway programs cannot block editing.
- Only success for the exact current source updates Canvas and enables PNG export. Diagnostics, analysis failures, runtime failures, or timeout clear the Canvas and disable PNG export.
- Browser-facing failures use structured GIC diagnostics and never expose raw JavaScript stack traces.
- Playwright drives the shared UI through Monaco, visible diagnostics, Canvas, Output, file workflows, and exports.
- Direct-`file://` standalone export has a separate required Chromium, Firefox, and WebKit matrix.
- Standalone HTML creates each preview worker from an inline JavaScript Blob and revokes its Blob URL after worker construction.
- The core remains free of DOM, Canvas, Monaco, worker, desktop, and test APIs.

The concrete bundler, Monaco worker packaging, and execution timeout value are implementation details selected and pinned by their owning slices.

## Current Baseline

- The shared core already returns plain parse, analysis, runtime, render-command, and structured-output data.
- The prototype browser shell uses a textarea, disposable workers, a 100 ms debounce, timeout termination, and Canvas command rendering.
- Static browser acceptance currently runs through Playwright Firefox.
- [The v0.9 roadmap](../plans/vertical-slice-roadmap.md) replaces the editor, expands shared-UI coverage, and adds the export browser matrix.
- Language capabilities are selected separately in [Language-Service, LSP, and VS Code Extension Scope](language-service-lsp-vscode-scope.md).

## Why This Is a Gate

Monaco integration, worker construction, preview lifecycle, stale-result handling, and direct-file exports can otherwise create incompatible execution paths. This decision keeps one source-to-result flow and gives every host a clear cancellation and presentation boundary.

## Considered Options

- **Monaco plus worker/runtime boundary — selected.** Provides an IDE-quality editor and hard cancellation while keeping Canvas and host APIs outside the interpreter. It requires explicit Monaco and worker bundling.
- **Monaco plus iframe.** Familiar web isolation, but unnecessary because GIC source is not JavaScript and structured commands already cross a worker boundary.
- **CodeMirror or a lighter editor.** Smaller dependency surface, but does not match the selected workshop editor or existing Monaco-oriented design work.
- **Textarea prototype.** Lowest risk and useful for proving the pipeline, but insufficient as the workshop editor.
- **Direct main-thread execution.** Simpler messaging, but cannot safely stop recursion or expensive programs.

## Consequences and Deferred Details

- Monaco language features consume a direct browser-neutral service rather than introducing LSP into the web runtime.
- Worker messages must remain structured-clone-safe data.
- Desktop fallback can replace the shell while retaining the same shared UI.
- Standalone HTML omits Monaco but preserves worker cancellation and runtime diagnostics.
- Accessibility acceptance must include keyboard use, focus restoration, zoom, screen-reader announcements, and the response-copy accessibility setting.
- Exact Monaco version, bundler integration, and worker asset strategy belong to implementation slices and must not alter the boundary above.

## Decision Checklist

- Monaco selected for v0.9.
- Worker isolation and cancellation selected.
- Preview timing and stale-result behavior documented.
- Failure and Canvas/export behavior documented.
- Shared desktop/PWA UI documented.
- Browser and direct-file test seams documented.
- Core remains host-neutral.

## Unblocks

- [Browser IDE language assistance](../milestones/browser-ide-language-assistance.md)
- [Tauri desktop packaging](../milestones/tauri-desktop-packaging.md)
- v0.9 roadmap Slices 6 through 12

## Related Guidance

- [v0.9 vertical slices](../plans/vertical-slice-roadmap.md)
- [Language-Service decision](language-service-lsp-vscode-scope.md)
- [Implementation architecture](<../../docs/Language specification.md#implementation-architecture>)
- [Live preview panel](<../../docs/Language specification.md#live-preview-panel>)
- [Error message guidelines](<../../docs/Language specification.md#error-message-guidelines>)
- [Testing strategy](<../../docs/Language specification.md#testing-strategy>)

## Non-Goals

- Selecting the desktop shell implementation.
- Selecting provider/authentication implementation.
- Adding animation to the static v0.9 release gate.
- Selecting LSP or VS Code extension scope.
- Selecting CLI export or server rendering.
- Changing language grammar or runtime semantics.
