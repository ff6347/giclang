<!-- ABOUTME: Records the first static-drawing vertical slice session. -->
<!-- ABOUTME: Captures the source runner, render commands, built-in checks, browser shell, and red Firefox test. -->

# Slice 1 Static Drawing

## Summary

Slice 1 is complete. The browser-neutral source-to-command path for the selected `background` and `circle` built-ins produces exact ordered render commands, and analyzer diagnostics block execution. The browser shell renders source edits to Canvas through a Web Worker, shows source-located diagnostics, and replaces stale workers on rapid edits. All three Firefox acceptance tests are green.

## Core Execution Path

- [decision] `runSource(source)` is a production core API, not a test helper. It composes parsing, analysis, interpretation, and command output.
- [decision] `RunResult` is discriminated: success contains commands and diagnostics; parser or analyzer failure contains diagnostics and no commands.
- [decision] Analyzer diagnostics stop the pipeline before the interpreter is constructed, so invalid source cannot produce preview commands.
- [decision] GIC remains a tree-walked language. The browser does not generate or evaluate JavaScript, and it does not maintain another interpreter.
- [decision] Serializable render commands are the boundary between language execution and presentation. `background` stores lightness, chroma, and hue; `circle` stores x, y, and radius.
- [technique] Source-level integration tests call the real `runSource()` path and assert exact command order rather than using a `TestInterpreter` subclass.

## Built-In Analysis

- [decision] Built-in arity validation reads the shared signature registry. Calls accept any matching signature length; accepted arities are deduplicated and sorted before diagnostics are formatted.
- [decision] Single-signature diagnostics retain the existing numeric wording. Overloaded calls use an English disjunction, such as `1, 3, or 4`.
- [lesson] Scope declarations describe user functions and variables. Built-ins live in the registry, so the user-function declaration branch cannot observe a `circle` or `background` call.
- [lesson] `FunctionEntry.signatures.length` counts overloads. A signature's length is one accepted arity, while `CallExpr.arguments.length` is the actual call-site arity.

## Browser Path

- [decision] Vite uses `browser/` as its application root. The shell contains a labelled textarea, a fixed 101 × 101 Canvas, and an aria-live diagnostics area.
- [decision] The browser worker will call the same `runSource()` API and return diagnostics or commands. The main thread will only present diagnostics and translate commands to Canvas.
- [technique] The Firefox Playwright acceptance test fills the textarea through the UI and polls real Canvas pixels. It requires opaque corner and center pixels and a center color different from the corner, avoiding test-only DOM markers.
- [decision] Playwright output directories are ignored. Vite and Playwright are exact development dependencies.

## Collaboration

- [preference] Fabian implements executable project behavior while the agent guides TDD, writes agreed test infrastructure and `ABOUTME:` headers, reviews, and handles documentation.
- [preference] Fabian's personal learning comments are intentional working notes. Agents preserve them unless Fabian requests comment review or removal.

## Commits

- `ed3bcbf feat(interpreter): execute background built-in`
- `961f38b feat(interpreter): execute circle built-in`
- `e25db1b feat(analyser): validate built-in arity`

All three commits are pushed to `origin/slice-1-static-drawing`.

## Verification

- Focused source-to-command tests and typecheck were reported green after the interpreter behaviors.
- Built-in arity integration tests, analyzer tests, and typecheck were reported green after registry-driven validation.
- `pnpm build:browser` passes with Vite 8.2.2.
- `pnpm fmt:check` passes after Playwright outputs were ignored.
- Playwright discovers one Firefox test.
- The headed Firefox test is intentionally red: corner and center pixels remain transparent and equal because browser execution and rendering are absent.
- Lint currently reports one warning for the intentionally empty `browser/src/main.ts`; Fabian chose to retain the entry file until behavior is implemented.

## Browser Test Checkpoint

The browser setup and red test were checkpointed after the reflection snapshot:

- `1578f81 chore(browser): scaffold Vite and Playwright`
- `9490eab test(browser): pin static preview acceptance`

## Preview Implementation

The worker-backed preview path landed in three follow-up commits:

- `e594fd3 feat(browser): render source changes on canvas`
- `86daef5 test(browser): pin invalid source feedback`
- `b8ba04c fix(browser): preserve diagnostic source locations`

The main thread debounces textarea input (100 ms), spawns a fresh worker per run, enforces a 500 ms execution timeout, and ignores messages from replaced workers by comparing against `activeWorker`. The worker calls `runSource()` and posts the `RunResult` back. On success the main thread translates `background` and `circle` commands to Canvas 2D calls; on diagnostics it clears the canvas and renders `Line N: message` paragraphs into the aria-live region.

- [technique] Results crossing the worker boundary must be plain data. `core.ts` converts caught `GicError`/`ParserError` instances into `{message, line, start, end}` literals before they reach `postMessage`, because structured clone does not preserve class instances for the consumer's `instanceof` checks and the browser only needs the fields.
- [technique] A stale-worker guard (`worker !== activeWorker`) in every callback prevents a timed-out or superseded worker from touching the DOM after its replacement has started.

## Slice Completion Verification

All quality gates verified green in a later session:

- `pnpm test`: 199/199 pass.
- `pnpm typecheck`, `pnpm typecheck:browser`, `pnpm lint`, `pnpm fmt:check`, `pnpm build:browser`: all clean.
- `pnpm test:e2e`: 3/3 Firefox tests pass (render, rapid-edit replacement, invalid-source diagnostics), run outside the agent sandbox.
- Core has no browser imports; `runSource()` remains the single pipeline.

- [lesson] Playwright Firefox cannot launch inside the nono sandbox (Mach `bootstrap_check_in` denied). Agent sessions must ask Fabian to run `pnpm test:e2e` in a regular terminal, or the session needs a nono grant.
- [lesson] Conversation context goes stale between sessions: files claimed to have type errors were already fixed in earlier commits. Always verify claims against the current working tree (`git status`, re-read files, run the gates) before diagnosing.

## Next Step

Slice 1 is done pending review and merge. Slice 2 (Computed Static Drawing) extends the runtime environment with variables, arithmetic, assignment, and `if` branches through the same source-to-canvas path.
