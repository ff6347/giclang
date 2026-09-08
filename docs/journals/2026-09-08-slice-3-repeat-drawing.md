<!-- ABOUTME: Records the Slice 3 repeat-execution and drawing-style checkpoint. -->
<!-- ABOUTME: Captures loop semantics, ordered color commands, browser conversion, and remaining work. -->

# Slice 3 Repeat Drawing

## Summary

Slice 3 now executes repeat statements through `runSource()` and records the
first ordered drawing-style commands. Repeat behavior covers ascending,
descending, zero-iteration, nested, and fractional ranges. The command model
uses tagged colors, and the browser converts tagged background colors into
Canvas styles, including percentage alpha.

The slice remains in progress. The browser renderer still needs to consume
`fill` and `noStroke` commands, and the one-argument CSS color overload remains
accepted by analysis without emitting a runtime command.

## Repeat Execution

- [decision] Repeat ends are exclusive in both directions. Positive steps run
  while the value is below the end; negative steps run while it is above the
  end. A step pointing away from the end performs zero iterations.
- [decision] Repeat bounds and the optional step are evaluated once in the
  surrounding environment before execution. An omitted step defaults to `1`,
  while an explicit zero step produces a source-located runtime diagnostic.
- [technique] Fractional iterator values are derived as
  `start + turn * step`, where `turn` is an integer counter. Repeatedly adding a
  fractional step accumulated enough floating-point drift to alter observable
  command values.
- [decision] One child `Environment` belongs to a complete repeat execution.
  The iterator is updated there for each turn, nested repeats get child
  environments, and assignments to existing outer variables still update their
  nearest owner.
- [decision] Semantic declarations distinguish `"repeat-variable"` from an
  ordinary variable. Assigning to an iterator reports
  `Cannot assign to repeat variable '<name>'.`

## Ordered Drawing Commands

- [decision] Style changes are separate commands in source order rather than
  style snapshots attached to shapes. The current core emits `fill`,
  `noStroke`, `background`, and `circle` commands in program order.
- [decision] Colors are tagged reusable values: numeric OKLCH components or a
  CSS string. Numeric lightness, chroma, and alpha use inclusive `0`–`100`
  ranges; hue uses inclusive `0`–`360`. Non-finite and out-of-range values are
  rejected rather than clamped or wrapped by the runtime boundary.
- [technique] `requireRange()` centralizes inclusive numeric range diagnostics
  after `requireArgumentNumber()` narrows each runtime argument.
- [decision] Numeric four-argument `background()` preserves its alpha component
  in the command. Browser conversion writes alpha as a percentage in the Canvas
  OKLCH string.

## Verification

- `pnpm test`: 284/284 core tests pass.
- `pnpm test:compact`: passes and discovers both core and browser test files.
- `pnpm typecheck` and `pnpm typecheck:browser`: pass.
- `pnpm lint`, `pnpm fmt:check`, and `git diff --check`: clean.
- `pnpm build:browser`: passes.
- `pnpm test:e2e`: 5/5 Firefox tests pass.

## Commits

- `914b9d6 refactor: clarify drawing argument validation`
- `c3a5dbe feat(interpreter): execute repeat statements`
- `247272a feat(analyser): reject repeat variable assignments`
- `f1f7251 test(interpreter): cover repeat environment behavior`
- `539d161 feat(interpreter): record ordered style commands`
- `7354d2d feat(browser): render tagged background colors`
- `0cfecec chore(tools): add compact test output`

## Next Step

Teach the browser renderer to apply `fill` and `noStroke` in command order, then
add a Firefox acceptance program whose repeated geometry makes iterator order
and persistent style changes visible. Decide when to implement the already
registered one-argument CSS color overload instead of silently emitting no
command.

## Browser Style Checkpoint

- [decision] `background`, `fill`, and `stroke` share one browser-neutral color
  boundary. It accepts numeric OKLCH with optional percentage alpha, standard
  CSS named colors case-insensitively, and 3-, 4-, 6-, or 8-digit hexadecimal
  colors.
- [decision] The Canvas renderer processes ordered style commands with local
  state. Each preview begins with white fill, black stroke, width `1`, and fill
  and stroke enabled. `fill` and `stroke` re-enable their respective style after
  `noFill` or `noStroke`.
- [technique] The Firefox acceptance path now covers repeated rows, nested grids,
  invalid zero-step execution, CSS colors, alpha, fill/stroke toggles, stroke
  width, style order, and deterministic defaults between preview runs.
- [lesson] A Canvas stroke-edge pixel may be antialiased even when the requested
  color is opaque. Stroke-width acceptance should prove that a pixel differs
  from the background instead of requiring a pure channel value at the edge.
- [preference] Keep each E2E GIC source program inside its test. Duplicating small
  source snippets is preferable to distant shared fixtures when it makes the
  behavior easier to read.

The checkpoint passes the core suite, both typechecks, lint, formatting, browser
build, diff checks, and 19 Firefox E2E tests.

Relevant commits after the initial command checkpoint are:

- `f34d234 refactor(browser): extract canvas renderer`
- `1b05186 test(repeat): pin execution and preview behavior`
- `b60aa41 refactor(test): localize preview source programs`
- `31880ae feat(browser): apply recorded style state`
- `aa1d55b feat(interpreter): support drawing style commands`
- `49a1e8a feat(browser): render recorded style commands`

## Remaining Slice 3 Work

The registered `point`, `line`, `rect`, `ellipse`, `triangle`, `quad`, and `arc`
shape functions still need command records, interpreter dispatch, recording
coverage, and Canvas translation. Slice 3 also still needs its deterministic
example `.gic` fixture and final lesson/bookkeeping audit before completion.
