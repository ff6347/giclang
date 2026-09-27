<!-- ABOUTME: Records Slice 4 function, output, constant, and initial math runtime checkpoints. -->
<!-- ABOUTME: Captures durable decisions, testing lessons, verification, and remaining work. -->

# Slice 4 Reusable Sketch Functions

## Summary

Slice 4 now executes global user functions through the ordinary call path. Functions bind parameters in isolated call environments, read and mutate globals, return values, propagate early returns through conditionals and repeats, and support terminating recursion. Drawing built-ins and user functions resolve through one internal callable registry.

`runSource()` now returns structured print output with source-token evidence on success and failure. Built-in constants resolve as read-only registry values. The initial pure-math path registers `floor`, `ceil`, and `abs`; the remaining math, random, analyzer, and browser work is still open.

## Collaboration

- [preference] Slice planning and architecture discussion happen directly with Fabian. Subagents are limited to precisely specified mechanical test work.
- [preference] The agent writes behavioral tests and reviews delegated test changes; Fabian writes executable production behavior.
- [preference] When Fabian implements behavior before a test exists, review the behavior directly and ask whether it should be pinned rather than insisting that the implementation be discarded for a red/green replay.
- [technique] A cheaper test-writing model is sufficient for short explicit source programs when the primary agent checks the source, expected values, offsets, and actual red or green result.

## Callable Runtime

- [decision] `Environment` continues to contain only user-visible `number | string | boolean` values. A separate registry stores internal callable descriptors.
- [decision] Drawing, print, pure-math, and user callables resolve through one registry and one interpreter invocation seam. Callable objects never become GIC expression values.
- [technique] A user callable retains its `FuncStmt`. Declaration execution registers that statement without evaluating parameters or running the body.
- [technique] Calls evaluate arguments once from left to right in the caller, bind parameters in a fresh environment whose parent is global scope, and run the body against the original ordered command list.
- [lesson] A recursion test preserves a local value across the recursive call; it would fail if invocations reused one local environment. Sequential calls that overwrite the same declarations would not expose that bug.

## Return Propagation

- [decision] A return is represented by an internal `ReturnSignal` containing a value or the internal `VOID` marker. Only the user-function call boundary unwraps that signal.
- [technique] `executeStatements()` stops at the first signal. Conditional and repeat execution propagate it unchanged, allowing a nested return to exit the surrounding function.
- [lesson] Normal completion must return `undefined`, not a fabricated void return signal. Otherwise any completed branch would accidentally exit its function.
- [lesson] A test with `return` as the final body statement does not prove early exit. A separate regression places a drawing call after return and asserts that it is skipped.

## Print Output and Constants

- [decision] Every `RunResult` carries `output: OutputEntry[]`. Each entry stores formatted text plus the 0-based line and half-open absolute offsets of the `print` token, not the argument or complete call.
- [decision] String output is unquoted, numbers use ordinary string conversion, and booleans become `true` or `false`.
- [technique] `runSource()` owns the output array and injects a sink into the interpreter. Output emitted before a runtime diagnostic survives the catch; parser and analyzer failures retain an empty output array.
- [decision] `PI`, `WIDTH`, and `HEIGHT` store their actual values in the shared built-in registry. Identifier evaluation falls back to constant entries after ordinary environment lookup.

## Initial Math Checkpoint

- [decision] Pure math handlers use one callable kind and return numbers without emitting commands or output.
- [technique] A typed math-handler map verifies ordinary function declarations against the shared call signature; individual handlers do not need arrow function annotations.
- [decision] Math arguments must be finite numbers. The initial handlers cover `floor`, `ceil`, and `abs`; remaining handlers and domain diagnostics require focused tests.
- [technique] Drawing functions and their registry now live in `src/draw.ts`, while shared argument and color helpers remain separate modules.

## Verification

At this checkpoint, focused tests cover reusable drawing helpers, value returns, return propagation, global effects, argument order, recursive isolation, structured print output, constants, and initial unary math. Core tests, TypeScript checks, lint, formatting, and browser build pass. Firefox acceptance has not been rerun for this checkpoint.

## Next Steps

1. Add focused tests and handlers for `round`, `min`, `max`, `sqrt`, `pow`, degree-based `sin`, and degree-based `cos`.
2. Pin dynamic type and finite/domain runtime diagnostics.
3. Implement p5-compatible seeded randomness and range errors.
4. Add limited analyzer checks for literal kinds, obvious domains, and built-in void calls used as values.
5. Forward structured print output in the browser and complete Firefox function, seeded-output, and runaway-recursion acceptance.

## Remaining Math Checkpoint

The ordinary math surface is implemented and pushed. `round`, `min`, `max`, `sqrt`, `pow`, and degree-based `sin`/`cos` can feed drawing geometry. Runtime math guards reject non-number inputs, negative `sqrt` inputs, and `pow` results that become `NaN` or infinity.

- [decision] Finite arguments are a precondition and a finite result is a separate postcondition. A host `Math` result is only a candidate until it passes the postcondition and may be returned to GIC.
- [lesson] Blanket rejection of negative `pow` bases or exponents was incorrect: `pow(-2, 3)` is `-8` and `pow(2, -3)` is `0.125`. Compute `Math.pow()` once and reject only a non-finite result.

Relevant pushed commits:

- `3ec4e32 feat(interpreter): evaluate remaining math functions`
- `677db10 fix(math): reject non-finite results`
- `aadad48 docs(drawing): describe color argument validation [skip ci]`

The full quality gates passed before `677db10`; both math commits and the drawing comment are pushed.

## Seeded Randomness Red Checkpoint

`src/tests/interpreter.random.test.ts` is an untracked red test file with eleven explicit source-level contracts. It covers an unseeded half-open range, the exact p5-compatible sequence for seed 42, reseeding, run isolation, unsigned negative/fractional seed coercion, invalid bounds, and dynamic argument types. Absolute diagnostic offsets for the renamed `minimum` and `maximum` fixtures are 21..27 and 22..28 because offsets count from the beginning of the complete source and the end is exclusive.

The current uncommitted `src/math.ts` work registers `random` and `randomSeed` in `mathCalls`. `random(min, max)` validates finite number arguments and uses `Math.random()`. `randomSeed(seed)` validates and returns the seed, but it does not yet own or mutate random state. Treat this as Fabian's in-progress implementation and do not overwrite it.

Focused randomness state:

- 11 tests total: 4 pass, 7 fail intentionally.
- Passing: unseeded range and dynamic non-number minimum, maximum, and seed.
- Failing: seeded sequence, reseeding, separate-run isolation, unsigned seed coercion, and equal/reversed bound errors.
- `pnpm typecheck`, `pnpm fmt:check`, and `git diff --check` pass in this red checkpoint.
- HEAD `aadad48` matches origin (`0 0` divergence); only `src/math.ts` and the untracked randomness test differ from HEAD.

The p5 reference was refreshed through the librarian cache at `/Users/tomato/.cache/checkouts/github.com/processing/p5.js`, commit `dc97a4fe885858ebe72eaa7c562ad558dda85501`. Its LCG uses modulus `4294967296`, multiplier `1664525`, increment `1013904223`, and unsigned seed coercion via `>>> 0`.

## Current Next Step

Stop before adding more behavior and choose the per-interpreter random-state boundary. A static entry in the module-level math handler map cannot by itself provide reseeding and run isolation. Preserve the shared callable-dispatch seam; do not special-case names in `Interpreter.onCall()`. After the state owner is settled, make the seed-42 sequence green first, then reseeding/isolation, then bound errors. Fabian writes production behavior; the agent reviews and runs the focused tests.

## Seeded Randomness Green Checkpoint

Seeded randomness is implemented and committed as `fed4b9e`. A random-call factory creates mutable state for each `CallableRegistry`, so separate interpreters cannot share a sequence. `randomSeed()` initializes that state with unsigned 32-bit coercion, while unseeded calls continue to use `Math.random()` without creating LCG state.

- [decision] Void built-in effects have an explicit callable kind. The interpreter invokes an effect through the ordinary callable seam and converts host `void` to its internal `VOID` marker; it does not inspect built-in names.
- [technique] The p5-compatible LCG advances closure-owned state before scaling its unit value into the requested half-open range. Reseeding replaces the state and restarts the sequence.
- [lesson] Typing both `random()` and `randomSeed()` as one `number | void` handler obscures their runtime contracts. Distinct value and effect handler types let callable-kind narrowing preserve the distinction.
- [lesson] An unseeded range test does not prove that every unseeded call uses `Math.random()`. The implementation must return directly from the unseeded path without initializing LCG state.

All eleven focused randomness tests pass. Core tests, both TypeScript checks, lint, formatting, browser build, and diff validation pass. Fabian ran the full Firefox suite manually and reported all 28 tests passing after the sandboxed Firefox process could not obtain the IPC capabilities needed to start.

The next checkpoint is limited analyzer diagnostics for literal built-in arguments, obvious domains, and void built-ins used where values are required.

## Built-in Literal-Kind Analyzer Checkpoint

Named built-in parameter metadata and static literal-kind validation are implemented and pushed as `33b4b44`.

- [decision] Each built-in signature remains an ordered overload but stores a parameter name beside each value kind. Static diagnostics can therefore match runtime wording such as `value`, `min`, `max`, and drawing coordinates.
- [decision] Static argument kinds are known only for direct literals and unary minus applied directly to a numeric literal. Variables, calls, groupings, and computed expressions remain unknown and are deferred to runtime validation.
- [technique] Built-in overload checking first filters signatures by arity, then accepts a call when one candidate matches every known argument kind. Unknown arguments act as wildcards rather than triggering inference.
- [lesson] Kind checking must compare complete candidate signatures. Comparing each argument against unrelated overloads can incorrectly accept a combination that no single overload supports.
- [lesson] Call diagnostics do not return early. The analyzer still walks the callee and every argument so independent findings remain observable.

Eight focused literal-kind tests and all existing analyzer and registry tests pass. The full core suite, both TypeScript checks, lint, formatting, browser build, and diff validation passed before the checkpoint commit.

The next red checkpoint covers obvious literal domains for `sqrt`, `pow`, and `random`, followed by built-in void calls used where a value is required.

## Built-in Literal-Domain Analyzer Checkpoint

Obvious literal-domain validation is implemented and committed as `28773ac`. The analyzer extracts numeric values only from direct number literals and unary minus applied directly to a number literal. Groupings, calls, variables, and computed expressions remain unknown and are deferred to runtime validation.

- [decision] Domain validation runs only after matching arity and literal kinds. This preserves diagnostic priority while the existing unconditional argument traversal continues to collect independent findings.
- [decision] A direct negative `sqrt` input is invalid. `pow` computes the host result only when both arguments are direct signed literals and rejects a non-finite result. `random` rejects direct bounds where `min >= max`.
- [lesson] Static and runtime validation intentionally use the same diagnostic wording. The distinction is the phase: direct signed literals fail analysis, while dynamic values remain the interpreter's responsibility.

Nineteen focused built-in analyzer tests and all 125 analyzer/registry tests pass. Core tests, both TypeScript checks, lint, formatting, browser build, and diff validation pass. The sandboxed Firefox run started Vite but was aborted before completing; the known nono Firefox limitation remains.

The next checkpoint is built-in void calls used where a value is required.

## Built-in Void-Value Analyzer Checkpoint

Built-in void-value diagnostics are implemented and pushed as `9512d48`.

- [decision] The analyzer reads each built-in function's registry `returnKind`; no built-in name is special-cased for void behavior.
- [decision] A direct call expression statement may discard a void result. Initializers, operators, returns, and call arguments require values.
- [decision] Void-value misuse is checked only after arity, literal-kind, and literal-domain validation, preserving one diagnostic at the call token. Callees and arguments remain unconditionally traversed afterward.

All ten focused built-in void tests and all 135 analyzer/registry tests pass. The full core suite, both TypeScript checks, lint, formatting, browser build, and diff validation pass.

Five Firefox acceptance tests are prepared in untracked files: `e2e/print-preview.spec.ts` covers ordered developer-console output and output before runtime diagnostics; `e2e/reusable-functions-preview.spec.ts` covers the reusable motif example, independent seeded runs, and recursion cancellation. The next implementation checkpoint forwards output to the console and adds `examples/reusable-motif.gic`, then runs all 33 Firefox tests outside nono.

## Browser Acceptance and Slice Completion

Browser output forwarding, the reusable motif fixture, and five Firefox acceptance tests are committed as `68b3bd1`. Specification and lesson updates are committed as `fff4c02`, and the completed Slice 4 plan is removed separately as `eba737c`.

- [decision] The browser developer console presents each structured output entry as `Line N: text`, converting source lines to 1-based numbering.
- [lesson] Output forwarding belongs before the worker result success/failure branch. Placing it only in the success branch would discard output retained by `runSource()` before a runtime diagnostic.
- [technique] The seeded Firefox test places an invalid preview between two seed-42 runs, clears the Canvas, and then compares exact Canvas data. This proves a fresh worker reproduced the image instead of accepting stale pixels.
- [technique] The recursion acceptance program performs bounded work in each recursive call so the replaceable worker's 500 ms timeout terminates it before the JavaScript stack overflows.
- [decision] `examples/reusable-motif.gic` uses one line-and-circle function at two positions as the deterministic Slice 4 experiment.
- [decision] A visible on-screen output panel remains deferred to browser IDE runtime-error UX work; Slice 4 forwards output only to the developer console.

All 33 Firefox tests pass in Fabian's external run. The full core suite, both TypeScript checks, lint, formatting, browser build, Playwright test discovery, and diff validation pass. Slice 4 acceptance is complete.
