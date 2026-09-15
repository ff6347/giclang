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
- The browser Canvas static backend can draw a static 100x100 program.
- Deterministic browser acceptance verifies static Canvas output through the real editor and worker path.

## Concepts to Understand

- The browser IDE is a client of the core language pipeline, not a second implementation.
- Diagnostics should update as the source changes and clear when the source is fixed.
- Static preview should not continue pretending to be fresh after errors appear.
- The selected technology and sandbox model must come from the decision document.
- Beginner-facing errors should be clear and should not expose raw stack traces.

## Relevant Specification Links

- [Immediate Visual Feedback](<../Language specification.md#3-immediate-visual-feedback>)
- [Fail Clearly](<../Language specification.md#4-fail-clearly>)
- [Implementation Architecture](<../Language specification.md#implementation-architecture>)
- [Semantic Analyzer component](<../Language specification.md#3-semantic-analyzer-analyzerts>)
- [Render Backends](<../Language specification.md#5-render-backends>)
- [LSP Server component](<../Language specification.md#6-lsp-server-lspserverts>)
- [Live Preview Panel](<../Language specification.md#live-preview-panel>)
- [Error Message Guidelines](<../Language specification.md#error-message-guidelines>)

## Included

- The selected browser shell wired to the browser-neutral check path.
- Source-located diagnostics that appear, update, and clear in the browser IDE.
- A static 100x100 preview path using the existing browser Canvas static backend.
- UI behavior that blocks or marks preview output as stale when checking fails.
- Tests or smoke checks that prove the implementation follows the selected decision documents.

## Grammar and AST Shape / Interface Boundary

No grammar or AST changes belong in this milestone.

The interface boundary is browser-to-core: the prototype browser shell calls
direct core diagnostics and static preview APIs through disposable workers. The
completed textarea implementation proves this boundary. Monaco replaces the
input surface in v0.9 roadmap Slice 6 without replacing the core or worker
pipeline.

## TDD-oriented Student Checklist

- Start with a failing browser or service test for diagnostics from invalid source.
- Add a test proving diagnostics clear or update after the source is fixed.
- Add a static preview smoke test for a valid 100x100 fixture.
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
- Browser smoke: a valid static program produces a visible 100x100 preview.
- Browser smoke: diagnostics carry source locations and clear after a fix.
- Browser smoke: user-facing failures do not show raw stack traces.

## Notes / Decision Gates

Both required decisions are accepted, and the textarea-based static milestone
is complete. Monaco migration and broader assistance remain separate v0.9
slices so the working source-to-Canvas behavior stays pinned during replacement.
