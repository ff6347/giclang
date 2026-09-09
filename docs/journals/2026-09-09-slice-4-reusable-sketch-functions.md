<!-- ABOUTME: Records Slice 4 function, output, constant, and initial math runtime checkpoints. -->
<!-- ABOUTME: Captures durable decisions, testing lessons, verification, and remaining work. -->

# Slice 4 Reusable Sketch Functions

## Summary

Slice 4 now executes global user functions through the ordinary call path.
Functions bind parameters in isolated call environments, read and mutate globals,
return values, propagate early returns through conditionals and repeats, and
support terminating recursion. Drawing built-ins and user functions resolve
through one internal callable registry.

`runSource()` now returns structured print output with source-token evidence on
success and failure. Built-in constants resolve as read-only registry values.
The initial pure-math path registers `floor`, `ceil`, and `abs`; the remaining
math, random, analyzer, and browser work is still open.

## Collaboration

- [preference] Slice planning and architecture discussion happen directly with
  Fabian. Subagents are limited to precisely specified mechanical test work.
- [preference] The agent writes behavioral tests and reviews delegated test
  changes; Fabian writes executable production behavior.
- [preference] When Fabian implements behavior before a test exists, review the
  behavior directly and ask whether it should be pinned rather than insisting
  that the implementation be discarded for a red/green replay.
- [technique] A cheaper test-writing model is sufficient for short explicit
  source programs when the primary agent checks the source, expected values,
  offsets, and actual red or green result.

## Callable Runtime

- [decision] `Environment` continues to contain only user-visible
  `number | string | boolean` values. A separate registry stores internal
  callable descriptors.
- [decision] Drawing, print, pure-math, and user callables resolve through one
  registry and one interpreter invocation seam. Callable objects never become
  GIC expression values.
- [technique] A user callable retains its `FuncStmt`. Declaration execution
  registers that statement without evaluating parameters or running the body.
- [technique] Calls evaluate arguments once from left to right in the caller,
  bind parameters in a fresh environment whose parent is global scope, and run
  the body against the original ordered command list.
- [lesson] A recursion test preserves a local value across the recursive call;
  it would fail if invocations reused one local environment. Sequential calls
  that overwrite the same declarations would not expose that bug.

## Return Propagation

- [decision] A return is represented by an internal `ReturnSignal` containing a
  value or the internal `VOID` marker. Only the user-function call boundary
  unwraps that signal.
- [technique] `executeStatements()` stops at the first signal. Conditional and
  repeat execution propagate it unchanged, allowing a nested return to exit the
  surrounding function.
- [lesson] Normal completion must return `undefined`, not a fabricated void
  return signal. Otherwise any completed branch would accidentally exit its
  function.
- [lesson] A test with `return` as the final body statement does not prove early
  exit. A separate regression places a drawing call after return and asserts
  that it is skipped.

## Print Output and Constants

- [decision] Every `RunResult` carries `output: OutputEntry[]`. Each entry stores
  formatted text plus the 0-based line and half-open absolute offsets of the
  `print` token, not the argument or complete call.
- [decision] String output is unquoted, numbers use ordinary string conversion,
  and booleans become `true` or `false`.
- [technique] `runSource()` owns the output array and injects a sink into the
  interpreter. Output emitted before a runtime diagnostic survives the catch;
  parser and analyzer failures retain an empty output array.
- [decision] `PI`, `WIDTH`, and `HEIGHT` store their actual values in the shared
  built-in registry. Identifier evaluation falls back to constant entries after
  ordinary environment lookup.

## Initial Math Checkpoint

- [decision] Pure math handlers use one callable kind and return numbers without
  emitting commands or output.
- [technique] A typed math-handler map verifies ordinary function declarations
  against the shared call signature; individual handlers do not need arrow
  function annotations.
- [decision] Math arguments must be finite numbers. The initial handlers cover
  `floor`, `ceil`, and `abs`; remaining handlers and domain diagnostics require
  focused tests.
- [technique] Drawing functions and their registry now live in `src/draw.ts`,
  while shared argument and color helpers remain separate modules.

## Verification

At this checkpoint, focused tests cover reusable drawing helpers, value returns,
return propagation, global effects, argument order, recursive isolation,
structured print output, constants, and initial unary math. Core tests,
TypeScript checks, lint, formatting, and browser build pass. Firefox acceptance
has not been rerun for this checkpoint.

## Next Steps

1. Add focused tests and handlers for `round`, `min`, `max`, `sqrt`, `pow`,
   degree-based `sin`, and degree-based `cos`.
2. Pin dynamic type and finite/domain runtime diagnostics.
3. Implement p5-compatible seeded randomness and range errors.
4. Add limited analyzer checks for literal kinds, obvious domains, and built-in
   void calls used as values.
5. Forward structured print output in the browser and complete Firefox function,
   seeded-output, and runaway-recursion acceptance.
