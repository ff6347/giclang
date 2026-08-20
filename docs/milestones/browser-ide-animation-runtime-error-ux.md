<!-- ABOUTME: Explains browser IDE animation playback and runtime-error UX for GIC. -->
<!-- ABOUTME: Defines scheduler boundaries, decision gates, non-goals, and verification checks. -->

# Milestone: Browser IDE Animation and Runtime-Error UX

## Learning Goal

Extend the selected browser IDE from static preview to animation playback and clear runtime-error presentation without changing the language model.

## Prerequisites

- [Browser IDE MVP diagnostics and static preview](browser-ide-mvp-diagnostics-static-preview.md) is complete.
- The Canvas animation backend exists and matches the render backend interface.
- Animation built-ins and scheduler hooks are already defined.
- Setup and `loop` lifecycle behavior is implemented in the interpreter.
- The runtime error model carries messages and source evidence.
- [Browser IDE technology and sandbox model](../decisions/browser-ide-technology-sandbox.md) must first select the relevant browser scheduling and sandbox constraints.
- If runtime messages use language-service infrastructure, [language-service, LSP, and VS Code scope](../decisions/language-service-lsp-vscode-scope.md) must first select the relevant message-routing constraints.

## Concepts to Understand

- Animation is repeated execution of the existing program shape, not a second syntax mode.
- The browser UI controls scheduler state; the interpreter still owns language behavior.
- Edits should stop old animation work before starting a new preview.
- Runtime errors inside `loop` must be visible to beginners and must not crash the shell.
- Static programs should continue to render once even after animation support is added.

## Relevant Specification Links

- [Animation](<../Language specification.md#animation>)
- [Static Programs](<../Language specification.md#static-programs>)
- [Animated Programs](<../Language specification.md#animated-programs>)
- [Animation Built-ins](<../Language specification.md#animation-built-ins>)
- [Constants](<../Language specification.md#constants>)
- [Interpreter component](<../Language specification.md#4-interpreter-interpreterts>)
- [Render Backends](<../Language specification.md#5-render-backends>)
- [Live Preview Panel](<../Language specification.md#live-preview-panel>)
- [Error Message Guidelines](<../Language specification.md#error-message-guidelines>)

## Included

- Browser IDE playback for programs with a `loop` block.
- Stop, restart, or replacement behavior when source edits trigger a new preview.
- Clear runtime-error presentation for failures that happen during setup or inside `loop`.
- Source-location mapping for runtime errors when the failing AST node carries evidence.
- Confirmation that static programs still run once through the preview path.
- Alignment with the selected scheduler and backend boundaries from decision documents.

## Grammar and AST Shape / Interface Boundary

No new grammar or AST shape belongs in this milestone.

The milestone relies on the prior `Program` shape, including an optional `loopBlock`. Browser UI controls call the selected scheduler and animation backend. Runtime errors are converted into source-located beginner-facing messages without crashing the browser shell or leaking raw JavaScript stack traces.

## TDD-oriented Student Checklist

- Add an animated smoke test that proves repeated frames are requested.
- Add stop-and-restart behavior for edits while animation is active.
- Add a runtime-error case inside `loop` with source-located presentation.
- Add a static-program regression so non-animated programs still run once.
- Add a `frameCount` behavior check that shows visible movement over frames.
- Add a scheduler/backend alignment check against the selected browser decision.

## Non-Goals

- New animation syntax.
- Changing setup or `loop` lifecycle semantics.
- Language assistance features.
- Selecting the browser sandbox or scheduler technology.
- Desktop packaging.
- Server GIF export.

## Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm fmt:check`
- `pnpm lint`
- Browser smoke: animation is visible for a valid animated fixture.
- Browser smoke: `frameCount` can drive movement across frames.
- Browser smoke: editing restarts the preview cleanly.
- Browser smoke: runtime errors are clear and do not show raw stack traces.

## Notes / Decision Gates

The browser technology and sandbox decision remains mandatory. If language-service infrastructure is used to move runtime messages through the IDE, the language-service decision governs that routing.

Do not use this milestone to revisit animation syntax, change `loop` lifecycle rules, or add export behavior.
