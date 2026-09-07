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

## Conditional and Expression Checkpoint

The conditional runtime now handles false conditions, else branches, and nested
`else if` through the parser's nested `IfStmt` representation. Then and else use
separate sibling environments, with one environment shared by every statement
in the selected branch. Grouping returns its evaluated inner value. Unary minus
and boolean negation validate operand types and return the corresponding runtime
value.

- [technique] Source-level unary tests cover both valid operators and invalid
  operand types, including exact operator-token diagnostics.
- [lesson] A branch test that declares a value before using it in a later
  statement exposes an environment created inside the statement loop; a
  single-command branch does not.

## Drawing-Call Refactor

Drawing-specific argument validation and command construction live under
`src/draw/`. `Interpreter.onCall()` evaluates every argument exactly once in
source order, then delegates the resulting values and callee token to the
selected drawing function. `requireNumber()` provides one numeric guard and
consistent source-located diagnostics for all six implemented arguments.

- [decision] Drawing functions accept `unknown` runtime inputs and narrow them
  at their validation boundary. They do not import interpreter types.
- [lesson] The built-in registry accepts one-, three-, and four-argument
  `background` signatures, while this runtime slice implements only the numeric
  triple. A refactor briefly treated the other arities as runtime errors and
  ignored alpha; the selected Slice 1 behavior remains success with no emitted
  command until color overloads are implemented in Slice 3.

## Operator Extraction

Pure operator semantics now live in `src/operators.ts`. The interpreter remains
responsible for recursive operand evaluation and rejecting internal `VOID`
results; the operator module applies unary/binary behavior and reports errors at
operator tokens. This reduced `src/interpreter.ts` from 462 lines before the
call/operator refactors to 296 lines.

Relevant commits after the initial checkpoint:

- `479d7d6 feat(interpreter): execute else branches`
- `da827a3 feat(interpreter): evaluate unary expressions`
- `abb5dd7 refactor(onCall): Move drawing functions to their own files`
- `4748aa1 refactor(interpreter): centralize call argument evaluation`
- `b2d31a8 refactor(interpreter): extract operator evaluation`

Fabian reported all gates green after the operator extraction. The last
agent-run checkpoint before it had 225/225 tests passing with typecheck, browser
typecheck, lint, and formatting clean.

## Current Next Step

Complete the remaining arithmetic, comparison, equality, and logical expression
families one source-level red test at a time. Resolve the documented division by
zero and cross-type equality gates before encoding those semantics. Keep
operator application in `src/operators.ts` and recursive evaluation in the
interpreter.
