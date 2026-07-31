<!-- ABOUTME: Explains the browser IDE MVP milestone for diagnostics and static preview. -->
<!-- ABOUTME: Defines required decision gates, browser-core boundaries, non-goals, and verification. -->

# Milestone: Browser IDE MVP Diagnostics and Static Preview

## Learning Goal

Build the selected browser IDE foundation into an edit-check-static-preview loop that gives beginners clear diagnostics and immediate visual feedback for static programs.

## Prerequisites

- `../decisions/browser-ide-technology-sandbox.md` is a blocking decision document for the browser shell, sandbox, and technology choices.
- `../decisions/language-service-lsp-vscode-scope.md` is a blocking decision document for diagnostic and editor-service routing.
- Source locations are available in parser, analyzer, and runtime-facing diagnostics.
- A browser-neutral core API exposes checking and static preview behavior without depending on a specific UI framework.
- The analyzer harness returns beginner-readable diagnostics.
- Built-in call errors have stable messages and source evidence.
- The browser Canvas static backend can draw a static 101x101 program.
- CLI [`check` and `run` behavior](cli-check-run-entry-points.md) is already verified against the core pipeline.
- [Visual regression verification](example-program-visual-regression.md) exists for deterministic static output.

## Concepts to Understand

- The browser IDE is a client of the core language pipeline, not a second implementation.
- Diagnostics should update as the source changes and clear when the source is fixed.
- Static preview should not continue pretending to be fresh after errors appear.
- The selected technology and sandbox model must come from the decision document.
- Beginner-facing errors should be clear and should not expose raw stack traces.

## Relevant Specification Links

- [Immediate Visual Feedback](<../Language specification rev 2.md#3-immediate-visual-feedback>)
- [Fail Clearly](<../Language specification rev 2.md#4-fail-clearly>)
- [Implementation Architecture](<../Language specification rev 2.md#implementation-architecture>)
- [Semantic Analyzer component](<../Language specification rev 2.md#3-semantic-analyzer-analyzerts>)
- [Render Backends](<../Language specification rev 2.md#5-render-backends>)
- [LSP Server component](<../Language specification rev 2.md#6-lsp-server-lspserverts>)
- [Live Preview Panel](<../Language specification rev 2.md#live-preview-panel>)
- [Error Message Guidelines](<../Language specification rev 2.md#error-message-guidelines>)

## Included

- The selected browser shell wired to the browser-neutral check path.
- Source-located diagnostics that appear, update, and clear in the browser IDE.
- A static 101x101 preview path using the existing browser Canvas static backend.
- UI behavior that blocks or marks preview output as stale when checking fails.
- Tests or smoke checks that prove the implementation follows the selected decision documents.

## Grammar and AST Shape / Interface Boundary

No grammar or AST changes belong in this milestone.

The interface boundary is browser-to-core: the selected browser shell calls core diagnostics and static preview APIs. Do not assume Monaco, iframes, workers, a bundler, or any other technology unless `../decisions/browser-ide-technology-sandbox.md` explicitly selected it. Do not assume LSP or a direct language-service API unless `../decisions/language-service-lsp-vscode-scope.md` selected that route.

## TDD-oriented Student Checklist

- Start with a failing browser or service test for diagnostics from invalid source.
- Add a test proving diagnostics clear or update after the source is fixed.
- Add a static preview smoke test for a valid 101x101 fixture.
- Add behavior where preview is blocked or marked stale when errors are present.
- Perform a manual edit-check-preview pass with a tiny static fixture.
- Add a technology alignment check against the selected decision documents.

## Non-Goals

- Selecting the browser IDE technology, sandbox, editor, bundler, or worker model.
- Animation playback.
- Runtime-error UX beyond failures discovered while producing static preview.
- Completions, hover, signature help, or definition navigation.
- A VS Code extension.
- Desktop filesystem access.

## Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm fmt:check`
- `pnpm lint`
- Browser smoke: a valid static program produces a visible 101x101 preview.
- Browser smoke: diagnostics carry source locations and clear after a fix.
- Browser smoke: user-facing failures do not show raw stack traces.

## Notes / Decision Gates

This milestone is blocked until both `../decisions/browser-ide-technology-sandbox.md` and `../decisions/language-service-lsp-vscode-scope.md` exist and select the relevant boundaries.

If either decision is unresolved, keep the lesson in planning state. Do not silently choose Monaco, CodeMirror, iframes, workers, LSP, direct APIs, or bundler details inside this milestone.
