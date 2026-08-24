<!-- ABOUTME: Records the first static-drawing vertical slice session. -->
<!-- ABOUTME: Captures the source runner, render commands, built-in checks, browser shell, and red Firefox test. -->

# Slice 1 Static Drawing

## Summary

Slice 1 now has a browser-neutral source-to-command path for the selected
`background` and `circle` built-ins. The accepted program produces exact ordered
render commands, and analyzer diagnostics block execution. The browser shell and
Firefox test infrastructure exist in the working tree; the real browser test is
red because worker execution and Canvas command translation are not implemented.

## Core Execution Path

- [decision] `runSource(source)` is a production core API, not a test helper. It
  composes parsing, analysis, interpretation, and command output.
- [decision] `RunResult` is discriminated: success contains commands and
  diagnostics; parser or analyzer failure contains diagnostics and no commands.
- [decision] Analyzer diagnostics stop the pipeline before the interpreter is
  constructed, so invalid source cannot produce preview commands.
- [decision] GIC remains a tree-walked language. The browser does not generate or
  evaluate JavaScript, and it does not maintain another interpreter.
- [decision] Serializable render commands are the boundary between language
  execution and presentation. `background` stores lightness, chroma, and hue;
  `circle` stores x, y, and radius.
- [technique] Source-level integration tests call the real `runSource()` path and
  assert exact command order rather than using a `TestInterpreter` subclass.

## Built-In Analysis

- [decision] Built-in arity validation reads the shared signature registry.
  Calls accept any matching signature length; accepted arities are deduplicated
  and sorted before diagnostics are formatted.
- [decision] Single-signature diagnostics retain the existing numeric wording.
  Overloaded calls use an English disjunction, such as `1, 3, or 4`.
- [lesson] Scope declarations describe user functions and variables. Built-ins
  live in the registry, so the user-function declaration branch cannot observe a
  `circle` or `background` call.
- [lesson] `FunctionEntry.signatures.length` counts overloads. A signature's
  length is one accepted arity, while `CallExpr.arguments.length` is the actual
  call-site arity.

## Browser Path

- [decision] Vite uses `browser/` as its application root. The shell contains a
  labelled textarea, a fixed 101 × 101 Canvas, and an aria-live diagnostics area.
- [decision] The browser worker will call the same `runSource()` API and return
  diagnostics or commands. The main thread will only present diagnostics and
  translate commands to Canvas.
- [technique] The Firefox Playwright acceptance test fills the textarea through
  the UI and polls real Canvas pixels. It requires opaque corner and center
  pixels and a center color different from the corner, avoiding test-only DOM
  markers.
- [decision] Playwright output directories are ignored. Vite and Playwright are
  exact development dependencies.

## Collaboration

- [preference] Fabian implements executable project behavior while the agent
  guides TDD, writes agreed test infrastructure and `ABOUTME:` headers, reviews,
  and handles documentation.
- [preference] Fabian's personal learning comments are intentional working notes.
  Agents preserve them unless Fabian requests comment review or removal.

## Commits

- `ed3bcbf feat(interpreter): execute background built-in`
- `961f38b feat(interpreter): execute circle built-in`
- `e25db1b feat(analyser): validate built-in arity`

All three commits are pushed to `origin/slice-1-static-drawing`.

## Verification

- Focused source-to-command tests and typecheck were reported green after the
  interpreter behaviors.
- Built-in arity integration tests, analyzer tests, and typecheck were reported
  green after registry-driven validation.
- `pnpm build:browser` passes with Vite 8.2.2.
- `pnpm fmt:check` passes after Playwright outputs were ignored.
- Playwright discovers one Firefox test.
- The headed Firefox test is intentionally red: corner and center pixels remain
  transparent and equal because browser execution and rendering are absent.
- Lint currently reports one warning for the intentionally empty
  `browser/src/main.ts`; Fabian chose to retain the entry file until behavior is
  implemented.

## Current Working Tree

The Vite shell, Playwright setup, exact dependency updates, and red browser test
are uncommitted. Generated `browser/dist/`, `test-results/`, and
`playwright-report/` output is ignored.

## Next Step

Implement the smallest worker-backed preview path that makes the existing Firefox
test green: source changes start a worker, the worker calls `runSource()`, the
main thread receives commands, and Canvas translates `background` and `circle`.
Keep diagnostics and timeout/replacement behavior aligned with the Slice 0
decision record.

## Browser Test Checkpoint

The browser setup and red test were checkpointed after the reflection snapshot:

- `1578f81 chore(browser): scaffold Vite and Playwright`
- `9490eab test(browser): pin static preview acceptance`

Both commits are pushed. The acceptance test remains intentionally red and the
empty browser entry retains the documented lint warning until preview behavior is
implemented.
