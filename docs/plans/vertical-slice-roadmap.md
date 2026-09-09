<!-- ABOUTME: Plans the transition from layer-by-layer implementation to executable vertical product slices. -->
<!-- ABOUTME: Preserves every planned capability while delivering an experimentable browser runtime early. -->

# Vertical Slice Roadmap

## Purpose

Reorder the remaining GIC work around user-visible capabilities rather than
finishing the analyzer, interpreter, rendering, and editor as separate layers.
Each slice must leave a real program working through every layer it needs.

This roadmap changes delivery order, not product scope. The open items in
[`docs/LESSONS.md`](../LESSONS.md) remain the feature-completeness ledger. A
feature stays unchecked there until its full milestone criteria are satisfied,
even when an earlier slice implements part of it.

Decision documents also remain in scope. Because several decisions present
mutually exclusive options, preserving them means resolving each gate
explicitly and implementing the selected capability where applicable; it does
not mean implementing every option in a decision document.

## Transition Point

The horizontal analyzer phase ends after
[functions, calls, and arity](../milestones/semantic-functions-calls-arity.md).
Return and function-kind analysis was also completed before vertical slicing
began; Slice 4 consumes that completed analyzer behavior rather than rebuilding
it. At this point GIC has:

- a lexer, parser, AST, and source-located parser diagnostics;
- a browser-neutral parsing API;
- built-in signature metadata and reserved names;
- semantic traversal, lexical scopes, variable rules, and user-function call
  resolution;
- parser support for variables, expressions, conditionals, `repeat`, functions,
  returns, and the program-level `loop` tail.

Do not finish the remaining semantic milestones as another horizontal phase.
Move their rules into the slices that make those rules observable:

- return analysis belongs with executable functions;
- repeat immutability and numeric rules belong with executable repetition;
- built-in argument analysis belongs with executable built-ins;
- animation-specific analysis belongs with executable animation.

## Delivery Rules

1. Start each slice with a failing acceptance test expressed as GIC source and
   an observable result: diagnostics, runtime values, render commands, or
   browser behavior.
2. Add only the lower-level tests needed to isolate the next behavior. Avoid
   repeating the same contract at every layer.
3. Use real parser, analyzer, interpreter, and backend paths in integration
   tests. The recording backend is a real deterministic backend, not a mock.
4. Keep the language core free of DOM, Canvas, editor, and desktop APIs.
5. Do not generalize a boundary beyond the current slice unless the next known
   slice already requires it.
6. Keep all quality gates green between behaviors. User-facing slices also need
   browser verification following the `e2e-testing` skill.
7. Keep `docs/LESSONS.md` truthful: record partial work in the session journal,
   not by checking an incomplete horizontal milestone.
8. Finish each slice with an experiment Fabian can run, a small example, updated
   durable documentation, atomic commits, and a pushed branch.
9. Work in a feature branch/worktree, never directly in `main`. Follow the
   `worktree`, `commit`, `reflect`, and `review` skills.
10. Preserve the teaching boundary: Fabian writes and understands language
    behavior. Agents guide TDD, review code, and handle agreed mechanical work.

## Slice 0: Choose the Thin Browser Path

**Goal:** Make the minimum architecture decisions needed to deliver visible
output without deciding every future integration.

Resolve, with Fabian, the blocking parts of:

- [browser IDE technology and sandbox](../decisions/browser-ide-technology-sandbox.md);
- [language-service, LSP, and VS Code scope](../decisions/language-service-lsp-vscode-scope.md).

Timebox this gate to one working session. The decisions need only state:

- the first editor shell;
- a provisional main-thread, worker, or iframe execution boundary;
- the cancellation seam needed before recursion and animation arrive;
- how source changes trigger and replace a preview;
- whether the browser calls a direct shared service API first;
- the first browser test harness.

Prefer the smallest reversible route that can later gain language assistance.
Explicitly defer policies that Slice 1 cannot exercise; revisit cancellation
before functions and animation. Do not add LSP, VS Code, desktop packaging, or
a sophisticated editor merely to produce the first preview.

**Done when:** the two decision documents select enough provisional boundaries
for Slice 1, and a future agent no longer needs to choose browser architecture
while writing runtime code.

**Estimate:** 1 active day.

## Slice 1: First Static Drawing

**Experiment:** A valid program containing `background(...)` and `circle(...)`
produces visible output; an invalid call produces a source-located diagnostic.

**Work through the stack:**

- expose a browser-neutral check/analyze entry point;
- establish the minimal runtime value and runtime-error vocabulary;
- establish one ordinary callable-dispatch seam that selected built-ins use and
  later user functions can join without a syntax exception;
- interpret literals, expression statements, identifier call targets, and
  selected built-in calls;
- expose a static run-once lifecycle entry point that animation can extend;
- validate the selected drawing calls from the shared built-in registry;
- define the first render command records;
- implement a recording backend for those commands;
- translate those commands to a 100×100 browser Canvas;
- connect the selected minimal browser shell to diagnostics and preview.

**Acceptance criteria:**

- the acceptance program produces exact recording commands;
- the same program renders visibly in the real browser path;
- wrong built-in arity is reported without executing or showing stale output;
- browser-facing errors contain no raw JavaScript stack trace;
- the core has no browser imports;
- parsing, analysis, runtime, recording, and Canvas use one shared pipeline.

Only the built-ins needed by the acceptance program must work. Do not claim the
full built-in, recording-backend, Canvas, or browser-IDE milestones yet.

**Estimate:** 5–8 active days.

## Slice 2: Computed Static Drawing

**Experiment:** A sketch computes shape properties with variables, arithmetic,
assignment, and an `if` branch, then updates the static preview.

**Work through the stack:**

- complete the runtime environment and nearest-owner assignment behavior;
- interpret literals, grouping, unary, binary, logical, and identifier
  expressions;
- execute declarations, assignments, and conditionals with revision 2.2 block
  scopes; the active specification overrides the stale no-block-scope wording
  in `interpreter-conditionals.md`;
- add runtime operand and condition diagnostics;
- extend analysis only where this slice needs inferable operand or call checks;
- refresh or invalidate browser output after an edit.

**Acceptance criteria:**

- computed values affect recorded and visible geometry;
- only the selected conditional branch emits commands;
- block-local declarations do not leak;
- invalid dynamic operands fail through GIC runtime diagnostics;
- editing valid source changes the preview, while invalid source marks or clears
  stale output according to Slice 0's decision.

This slice should complete the runtime value/environment model and the
expression, variable, assignment, and conditional interpreter milestones.

**Estimate:** 5–8 active days.

## Slice 3: Repeated Pattern

**Experiment:** A `repeat` statement draws a deterministic row or grid of
shapes.

**Work through the stack:**

- finish repeat-variable semantic rules, including read-only iteration values;
- execute positive, negative, default, and fractional steps;
- evaluate bounds exactly once and reject zero step at runtime;
- complete current style, color, canvas, and shape built-ins;
- complete recording-backend command behavior and static Canvas translation;
- add a deterministic example fixture.

**Acceptance criteria:**

- a nested or repeated drawing fixture produces exact ordered commands;
- the browser shows the same static result represented by those commands;
- assignment to the repeat variable is diagnosed;
- loop-local values do not leak and outer mutations persist;
- valid and invalid fixtures behave consistently through the browser check and
  preview path;
- all current drawing commands have recording and Canvas coverage.

The combined repeat/animation semantic milestone remains open until Slice 5
completes its `loop` and `frameCount` rules.

**Estimate:** 5–8 active days.

## Slice 4: Reusable Sketch Functions

**Experiment:** A user-defined function computes or draws a repeated motif, and
a seeded random program reproduces the same result.

**Work through the stack:**

- use the completed return-placement, required-return, and void/value-kind analysis;
- execute function declarations, argument binding, calls, recursion, and early
  returns;
- preserve return propagation through conditionals and repeats;
- reject void calls in value contexts;
- complete built-in arity, literal-type, and confidently inferable domain
  diagnostics;
- implement `PI`, `WIDTH`, `HEIGHT`, math, print, and seeded randomness through
  the ordinary callable path;
- add runtime guards matching static built-in contracts.

**Acceptance criteria:**

- a drawing helper can be declared and called through normal GIC source;
- local call environments do not leak and globals behave according to the
  specification;
- early return exits nested control flow;
- void/value misuse is diagnosed before execution when inferable;
- seeded random output is repeatable;
- every current pure built-in is exercised through normal call dispatch.

This slice consumes the completed return-analysis milestone and should close the
function interpreter and pure built-in milestones. It completes non-animation
built-in call analysis, but the combined
built-in semantic milestone remains open until Slice 5 resolves `frameCount`
and `frameRate` policy.

**Estimate:** 7–10 active days.

## Slice 5: Animated Sketch

**Experiment:** Setup runs once and a `loop` block draws changing frames using
`frameCount`.

**Work through the stack:**

- finish semantic rules for the unique tail loop and animation-only names;
- finish the animation portion of built-in call analysis, then close that
  combined semantic milestone;
- separate setup from manually driven frame execution;
- preserve globals while recreating loop-block locals each frame;
- implement `frameCount`, `frameRate`, and the test scheduler seam;
- add the browser animation adapter over the tested lifecycle;
- define stop, replacement, restart, throttling, and per-frame command behavior;
- present setup and frame runtime errors at source locations;
- stop old execution when source changes.

**Acceptance criteria:**

- setup side effects happen once;
- manually stepping frames is deterministic in core tests;
- visible browser frames change using `frameCount`;
- editing an animated sketch does not leave duplicate schedulers running;
- stop and restart follow the selected policy;
- runtime failure stops or continues animation according to the documented
  decision and never crashes the editor shell.

This slice should close loop semantics, setup/frame lifecycle, animation
built-ins, animated Canvas, and browser animation/runtime-error milestones.

**Estimate:** 7–12 active days.

## Slice 6: Experiment-Ready Browser IDE

**Goal:** Turn the thin shell grown by Slices 1–5 into the coherent environment
Fabian will use for experiments.

**Work through the stack:**

Complete prerequisites in this order before claiming the browser IDE milestone:

- finish `gic check` and `gic run` over the shared core and selected backend;
- curate static and animated examples, then add deterministic command and
  selected visual-regression coverage;
- complete diagnostics update/clear behavior and static-preview UX;
- add only the language-assistance capabilities selected in Slice 0;
- derive built-in assistance from the shared registry;
- derive user-symbol assistance from parser/analyzer information rather than a
  duplicate symbol model;
- document the normal experiment workflow.

**Acceptance criteria:**

- a beginner can edit, diagnose, run, stop, and restart static and animated
  sketches without using developer tools;
- selected completion, signature, hover, or definition capabilities reflect
  actual scope and signatures;
- examples pass `gic check` and produce documented deterministic output;
- browser smoke coverage exercises the real shell and preview path.

This slice should close the browser IDE MVP, selected language assistance, and
example/visual-regression milestones.

**Estimate:** 5–10 active days, depending on the assistance selected in Slice 0.

## Slice 7: Distribution and Export

Treat distribution as user workflows, not platform layers.

1. Resolve the
   [desktop shell and filesystem decision](../decisions/desktop-shell-filesystem.md).
2. If Deno Desktop is selected, package the existing browser IDE without
   forking its language behavior; verify open, edit, preview, save, and restart
   as one workflow.
3. Resolve the
   [optional export/server-render decision](../decisions/cli-export-server-render-backends.md).
4. If export is selected, implement one end-to-end export workflow from GIC
   source to the selected artifact before adding another format.

Desktop and export remain independent: selecting or rejecting one must not
silently decide the other.

## Slice 8: Language Growth

The remaining design gates become separate vertical product slices after the
revision 2.2 experiment environment works. Do not combine them into one
horizontal “revision 3” implementation phase.

Recommended order:

1. [Dynamic lists](../decisions/dynamic-lists.md): choose the model, then make
   one retained-state sketch work through syntax/API, analysis, runtime,
   diagnostics, editor assistance, and examples.
2. [Built-in math expansion](../decisions/built-in-math-expansion.md): add only
   the selected helpers through registry, analysis, runtime, assistance, and an
   example that needs them.
3. [Drawing APIs and transforms](../decisions/additional-drawing-apis-transforms.md):
   add each selected command through recording, Canvas, animation policy, and
   visual verification.
4. [Documentation comments](../decisions/documentation-comments.md): carry one
   documented function from source retention through analyzer metadata to
   hover/signature presentation.
5. [Standard library and imports](../decisions/standard-library-import-model.md):
   decide after lists, then make one reusable helper cross the selected module
   boundary through browser and CLI workflows.
6. [Fuzzy prompt-oriented mode](../decisions/fuzzy-prompt-oriented-language-mode.md):
   keep strict `.gic` deterministic and implement the selected assistant or
   conversion workflow as a visibly separate mode.

Each accepted extension needs its own plan after its decision is resolved.
Rejecting or deferring an option must be recorded explicitly rather than
silently dropping it.

## Feature-to-Slice Map

| Existing open area                                | Delivery slice                                        |
| ------------------------------------------------- | ----------------------------------------------------- |
| Return and function-kind analysis                 | Completed before Slice 0; consumed by 4               |
| Repeat and program-loop analysis                  | 3 and 5                                               |
| Built-in call analysis                            | 1 incrementally; non-animation rules in 4; close in 5 |
| Runtime value, environment, and errors            | 1 incrementally; complete in 2                        |
| Expressions, variables, assignments, conditionals | 2                                                     |
| Repeat execution                                  | 3                                                     |
| Functions and returns                             | 4                                                     |
| Setup and frame lifecycle                         | 5                                                     |
| Pure built-ins                                    | 4                                                     |
| Render interface and recording backend            | 1 incrementally; complete in 3                        |
| Drawing/style/canvas built-ins                    | 1 incrementally; complete in 3                        |
| Animation built-ins and browser animation         | 5                                                     |
| Static Canvas                                     | 1 incrementally; complete in 3                        |
| CLI check/run                                     | 6, after runtime and animation prerequisites          |
| Examples and visual regression                    | Begin in 3; complete in 6                             |
| Browser technology and service decisions          | 0                                                     |
| Browser IDE static preview                        | Begin in 1; complete in 6                             |
| Browser IDE animation/runtime UX                  | 5                                                     |
| Browser IDE language assistance                   | 6                                                     |
| Desktop decision and packaging                    | 7                                                     |
| Lists, math, drawing, docs, imports, fuzzy mode   | 8, one slice each                                     |
| Optional export/server rendering                  | 7                                                     |

## Expected Checkpoints

The roadmap preserves the full long-term scope while moving useful feedback
forward:

- after Slice 1, Fabian can see the first real GIC drawing in a browser;
- after Slice 3, Fabian can experiment with useful static generative patterns;
- after Slice 5, Fabian can experiment with the revision 2.2 animation model;
- after Slice 6, the browser environment is a coherent first product;
- Slices 7 and 8 extend distribution and language scope without blocking that
  product.

Slices 0–1 should take roughly 6–10 active days. Slices 0–3 should take roughly
16–26 active days. An experiment-ready animated browser product through Slice 6
should take roughly 35–58 active days. These are planning ranges, not deadlines;
review them after every completed slice using observed delivery time.

## First Actions for the Implementing Agent

1. Verify the current worktree and recent commits; do not rely on this plan's
   transition snapshot.
2. Confirm the function-call analyzer milestone is committed, pushed, and green.
3. Review the active specification and every milestone linked by Slice 0 and
   Slice 1. Reconcile stale milestone wording against revision 2.2 before tests
   are written.
4. Facilitate the Slice 0 decisions with Fabian; do not choose the browser or
   sandbox architecture silently.
5. Convert Slice 1 into a small, testable implementation plan with one acceptance
   program and explicit browser verification.
6. Ask Fabian to review that slice plan before implementation begins.

## Plan Completion

This roadmap is complete when every current `docs/LESSONS.md` item has been
resolved and all selected capabilities have shipped through an experimentable
workflow. Once complete, remove this plan as required for completed files under
`docs/plans/`; consolidate durable architectural decisions into the
specification, decision records, and `docs/MEMORY.md`.
