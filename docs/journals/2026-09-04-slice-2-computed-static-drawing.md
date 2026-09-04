<!-- ABOUTME: Records the computed static-drawing Slice 2 checkpoint. -->
<!-- ABOUTME: Captures runtime environments, evaluated calls, assignment, comparison, and conditional progress. -->

# Slice 2 Computed Static Drawing

## Summary

Slice 2 now executes variable declarations, identifier reads, multiplication,
assignment, numeric greater-than comparison, and true `if` branches through the
real `runSource()` pipeline. Computed values reach `background` and `circle`
commands, and the source-level acceptance program is green. The slice remains
in progress: false/else behavior, the remaining expression families, and full
runtime diagnostics still need focused coverage and implementation.

## Runtime Values and Environments

- [decision] User-visible runtime values are `number | string | boolean`.
  Expression evaluation additionally uses a unique internal `VOID` symbol for
  successful calls that emit commands without producing a GIC value.
- [decision] Interpreter methods receive the current `Environment` explicitly.
  Declarations write to that environment, reads search its parent chain, and
  assignments update the nearest environment that already owns the name.
- [technique] `Environment.assign()` returns a boolean rather than throwing. The
  interpreter retains the assignment token and converts a missing owner into a
  source-located `GicError`.
- [lesson] A child environment belongs around an entire branch, not inside its
  statement loop. Creating one child per statement makes a declaration vanish
  before the next statement can read it.

## Expression and Call Evaluation

- [technique] Built-in arguments are expression nodes, not runtime values. Calls
  evaluate arguments left-to-right in the current environment, validate the
  resulting values, then emit platform-neutral commands.
- [decision] Binary operations reject the internal `VOID` marker and use the
  operator token for runtime diagnostics. Multiplication and greater-than
  currently require two numbers; greater-than returns a boolean.
- [lesson] A mixed-type comparison guard must require both operands to be
  numbers. Using logical OR admits one non-number and falls through to
  JavaScript coercion.

## Conditional Diagnostics

- [decision] `IfStmt` retains its `if` keyword token because expression nodes do
  not share a common source-location contract. Non-boolean condition diagnostics
  point at that keyword.
- [technique] The parser passes `previous()` immediately after matching `IF`,
  before consuming `(` changes the previous token. Recursive `else if` parsing
  passes the nested keyword in the same way.
- [technique] A focused raw-AST parser test pins the keyword lexeme and
  zero-based line plus half-open absolute offsets without expanding every
  simplified parser expectation.

## Commits Before This Checkpoint

- `a4a17d2 feat(interpretr): Add env`
- `54c73d3 chore: Config linter`
- `fc7bce3 test: Interpretr`
- `1903bd7 chore: allow informational console output`
- `90b8a19 feat(interpreter): execute variable assignments`

## Verification

- `pnpm test`: 211/211 pass before the reflection-only edits.
- `pnpm typecheck`, `pnpm typecheck:browser`, `pnpm lint`, and
  `pnpm fmt:check`: clean.
- `pnpm build:browser`: passes.
- `git diff --check`: clean.
- Browser e2e remains delegated to a regular terminal because Firefox cannot
  launch inside the nono sandbox.

## Current State

The computed acceptance source now flows through declaration, multiplication,
nearest-owner assignment, numeric comparison, and a true conditional branch to
ordered render commands. The current executable checkpoint also carries exact
mixed-comparison and non-boolean-condition diagnostics.

Next, add focused tests for a false condition and `else`, implement one sibling
scope for each selected branch, then complete grouping, unary, remaining binary,
and logical expression behavior required by Slice 2. Keep runtime condition
checks boolean-only; never inherit JavaScript truthiness.
