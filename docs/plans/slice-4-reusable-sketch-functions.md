<!-- ABOUTME: Plans Slice 4 delivery of reusable functions and deterministic pure built-ins. -->
<!-- ABOUTME: Defines decision gates, teaching roles, test checkpoints, and acceptance criteria. -->

# Slice 4: Reusable Sketch Functions

## Goal

Run reusable user-defined functions and deterministic pure built-ins from GIC
source through the browser without exposing callables, return signals, or void
markers as GIC values.

The finished experiment draws a reusable motif through an ordinary function call
and reproduces a seeded sketch exactly across repeated runs.

## Collaboration

Fabian approved this collaboration model for Slice 4; it supersedes the test
ownership described in the session handoff.

- The agent writes each failing behavioral test and confirms the expected red
  state.
- Fabian writes the production implementation that makes the test pass.
- The agent reviews the current working tree and verifies the focused behavior
  before each checkpoint is committed.
- When Fabian writes behavior before a test exists, the agent reviews whether it
  is correct instead of requiring the code to be rewritten through red/green.
- If untested behavior appears ambiguous or risky, the agent asks Fabian whether
  it should be pinned before adding a test.
- Tests use short named GIC programs through the highest practical public seam.
  They do not mock interpreter behavior.
- A bounded subagent using `openai-codex/gpt-5.6-terra` may implement mechanical
  test scaffolding after behavior is decided. The primary agent reviews every
  delegated diff; subagents do not implement Fabian's production behavior.

## Decisions

Fabian approved the following decisions during Slice 4 planning before tests
were encoded.

### Runtime bindings and calls

- `Environment` continues to store only user-visible `number`, `string`, and
  `boolean` values.
- A separate internal callable registry stores built-in callables and executed
  global function declarations.
- Function declarations register a callable without executing its body.
- `onCall()` evaluates arguments exactly once from left to right, resolves the
  identifier, and invokes every callable through one small internal interface.
- User function calls receive a fresh local environment whose parent is the
  global environment, never the caller's local environment.
- Constants remain read-only built-in values and never become callable entries.

### Returns

- Statement-list execution may produce an internal return signal.
- `if` and `repeat` execution propagate that signal immediately.
- The user-function call boundary unwraps the signal into a value or internal
  void result.
- Return signals and void results cannot be stored, printed, rendered, or
  observed as GIC values.

### Print output

- Every `RunResult` includes `output: string[]`.
- Each `print()` call appends one entry in source order.
- Strings are unquoted; numbers use ordinary decimal representation; booleans
  become `true` or `false`.
- Runtime failures retain output produced before the failure. Parser and analyzer
  failures return an empty output list.
- Failed runs continue to omit render commands.
- Fabian approved forwarding output to the browser developer console during
  Slice 4. A visible on-screen console is deferred to later browser IDE work.

### Randomness

- Before `randomSeed()`, `random()` uses `Math.random()`.
- After `randomSeed(n)`, the interpreter uses the same 32-bit linear
  congruential generator as p5.js.
- Seed conversion follows p5.js unsigned 32-bit coercion.
- Random state belongs to one interpreter run. Calling `randomSeed()` again
  restarts the sequence.
- `random(min, max)` is minimum-inclusive and maximum-exclusive.
- `min` must be less than `max`; equal or reversed bounds are errors rather than
  silently swapped.

### Built-in diagnostics

- Math functions accept only finite numbers and must produce finite numbers.
  Invalid domains, `NaN`, and infinities become source-located GIC diagnostics.
- The analyzer checks built-in arity, obvious literal argument kinds, obvious
  signed-literal domains, and void built-ins used where a value is required.
- The analyzer does not constant-fold expressions or perform general type
  inference.
- Runtime guards remain authoritative for variables, computed expressions, and
  direct interpreter use.

## Delivery Checkpoints

Each checkpoint starts with focused red tests written by the agent. Fabian then
implements only enough production behavior to make them green.

### 1. First vertical function call

Add a source-level acceptance program in a focused function interpreter test:

- declare a void helper that draws a small two-command motif;
- call it at two positions through ordinary function syntax;
- assert the exact four render commands and their source order;
- prove the declaration itself emits nothing.

This checkpoint introduces only callable registration, shared invocation,
parameter binding, fresh call environments, and direct `return;` behavior.

### 2. Value-returning functions

Add separate named programs proving:

- a returned number can determine visible geometry;
- expressions in `return expression;` are evaluated normally;
- statements after a taken return do not emit commands;
- a void call remains legal as a standalone statement.

### 3. Call isolation and global effects

Add focused programs proving:

- arguments evaluate once from left to right before body effects;
- separate calls do not share parameters or locals;
- functions can read globals declared before the reference;
- assignment updates an existing global when no local owner exists.

No-closure legality is already enforced before interpretation; this checkpoint
does not invent an invalid runtime program to retest it.

### 4. Nested returns and recursion

Add programs proving:

- a return inside an `if` exits the complete function call;
- a return inside a `repeat` exits the loop and function;
- nested return propagation skips all later side effects;
- a small terminating recursive value function produces visible output;
- each recursive invocation receives isolated parameter and local bindings.

Do not add path-sensitive all-branches analysis. The existing browser worker
remains the cancellation boundary for runaway recursion.

### 5. Public print output

Add public `runSource()` tests proving:

- string, number, and boolean output formatting;
- multiple prints preserve execution order;
- output from nested function calls preserves ordinary side-effect order;
- output emitted before a runtime error remains in the failed result;
- parse and analyzer failures contain empty output.

Update existing exact `RunResult` expectations mechanically once the public
shape is pinned by the new tests.

### 6. Constants and pure math

Exercise every current constant and pure math function through ordinary source
calls:

- `PI`, `WIDTH`, and `HEIGHT` resolve as read-only values;
- `floor`, `ceil`, `round`, `abs`, `min`, `max`, `sqrt`, and `pow` return values;
- `sin` and `cos` consume degrees;
- results can feed expressions, print output, and drawing geometry;
- dynamic invalid types and domains produce runtime diagnostics;
- non-finite math results are rejected at the originating call.

Keep each source program short and named rather than using a table-driven
behavior matrix.

### 7. Seeded randomness

Add source-level tests proving:

- unseeded values remain inside the requested half-open range;
- the selected seed produces the exact p5-compatible sequence;
- reseeding restarts that sequence;
- two separate runs of the same seeded source return identical output and
  commands;
- interpreter runs do not share random state;
- equal and reversed bounds fail clearly;
- dynamically invalid bounds are guarded at runtime.

### 8. Static built-in diagnostics

Add analyzer tests proving:

- literal argument kinds are checked from the shared built-in registry;
- overload selection accounts for both arity and literal kinds;
- literal `sqrt`, `pow`, and `random` domain errors are reported when obvious;
- built-in void calls cannot initialize variables or feed expressions;
- computed arguments without an inferable kind or domain remain accepted for
  runtime validation;
- argument expressions are still traversed after a call diagnostic.

Do not infer variable types or evaluate arbitrary constant expressions.

### 9. Browser acceptance and experiment

Add Firefox coverage proving:

- a function-drawn motif appears through the real textarea, worker, command, and
  Canvas path;
- a seeded source program produces identical Canvas data after two independent
  preview runs;
- successful `print()` entries reach the browser console in order;
- print output emitted before a runtime failure reaches the console before the
  diagnostic is presented;
- runaway recursion is terminated by the existing 500 ms worker boundary and
  reports the timeout without leaving stale Canvas output.

Add a small deterministic reusable-motif example as the Slice 4 experiment.
Keep `examples/connected-nodes.gic` as a broader manual experiment rather than
an acceptance fixture.

### 10. Documentation and completion

- Update the language specification with the selected random, numeric-domain,
  and print-result contracts.
- Update applicable lesson status without closing animation-dependent work.
- Record durable implementation lessons in the journal and `docs/MEMORY.md`.
- Record the future visible browser console in later browser IDE planning.
- Remove this completed plan in its own commit once the slice is finished.
- Review the branch, push all atomic commits, and verify synchronization.

## Out of Scope

- Closures, nested function declarations, and first-class callable values.
- Implicit returns or user-visible null/undefined values.
- Path-sensitive all-branches return analysis.
- General static type inference or compile-time expression evaluation.
- Animation, `frameCount`, `frameRate`, and setup/frame lifecycle.
- A visible browser output console.
- New built-ins, including `dist()`.
- Adapting `connected-nodes.gic` into a required acceptance fixture.

## Acceptance Gate

Slice 4 is complete only when:

- reusable void and value functions execute through ordinary source syntax;
- declaration, argument order, local isolation, global mutation, nested returns,
  and terminating recursion are observable through tests;
- constants, print, every specified pure math function, and p5-compatible seeded
  randomness use the shared callable path;
- static literal diagnostics and dynamic runtime guards agree on their shared
  contracts;
- browser function drawing, seeded reproducibility, print forwarding, and
  recursion cancellation pass in Firefox;
- the deterministic motif example is runnable;
- documentation and lesson state are truthful;
- all quality commands pass with pristine output:

```sh
pnpm test:compact
pnpm typecheck
pnpm typecheck:browser
pnpm lint
pnpm fmt:check
pnpm build:browser
pnpm test:e2e
git diff --check
git status --short --branch
```
