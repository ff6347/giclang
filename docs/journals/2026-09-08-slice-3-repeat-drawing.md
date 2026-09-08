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
