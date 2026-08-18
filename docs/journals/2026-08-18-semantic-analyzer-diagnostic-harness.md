<!-- ABOUTME: Records the analyzer diagnostic harness session. -->
<!-- ABOUTME: Covers the analyzer contract, traversal observability, the observer-effect bug, and verification. -->

# Semantic Analyzer Diagnostic Harness

## Summary

Completed `docs/milestones/semantic-analyzer-diagnostic-harness.md`. The
`Analyser` class in `src/analyzer.ts` walks the whole AST (all statement
and expression kinds plus the loop tail) and returns collected
diagnostics — currently always empty, since no semantic rules exist yet.
Traversal is proven by a counting `TestAnalyser` subclass in the test
file, with per-kind visit counts hand-derived from a fixture program and
pinned via `deepStrictEqual`.

## Decisions

- [decision] Analyzer contract: `analyze()` takes the `Program` from the
  constructor (Lexer/Parser family shape) and returns `Diagnostic[]`.
  Semantic findings are data and are collected, never thrown — collect-many
  serves LSP-style consumers who want every error per run. Throws are
  reserved for unhandled node kinds (implementation bugs), matching
  `parseSource`'s expected-vs-unexpected split.
- [decision] The walker dispatches via exhaustive `switch` on node tags to
  `protected` per-kind methods. No double dispatch, no `accept` methods,
  no visitor interface — the switch is the manual dispatch; the methods
  are the seams. Later milestones add rules inside these methods; tests
  observe traversal by subclassing them.
- [decision] Exhaustiveness comes from a `default` that assigns the node
  to `never` and throws. The variable is read in the throw message so
  `noUnusedLocals` stays quiet; unused parameters in leaf handlers are
  underscore-prefixed.
- [decision] `Program` and `LoopStmt` sit outside the `Statement` union,
  so compile-time exhaustiveness cannot prove full traversal. The loop
  tail gets its own protected seam (`onLoopStatement`) called from
  `analyze()`.
- [decision] Traversal observability lives in the test file, not
  production: `TestAnalyser` tallies visits per kind in a `Map` through a
  uniform count-then-`super` override per kind. Events/emitter ideas were
  collapsed into direct method calls (one listener needs no registry).
- [decision] Expected visit counts are hand-derived from the fixture, not
  read off the implementation. Pins come from intent; an implementation
  cannot certify itself.

## Lessons

- [lesson] An assertion green under both a correct and a broken
  implementation proves nothing. This milestone produced three: the green
  test that never walked the loop tail, the `@ts-ignore` that muzzled the
  `never` exhaustiveness check, and the coverage test that asserted only
  an empty report. The fix each time was making the effect observable.
- [lesson] An override that wraps must call `super` or observation alters
  behavior: a super-less `onLogical` override in the test subclass
  silently stopped the walk, losing 5 nodes under one `&&` (44 expected,
  39 observed). Uniform count-then-super, no special cases for leaves.
- [lesson] Grand totals hide what per-kind tables reveal. The sum 44 can
  hold while a kind goes unvisited and another is double-counted; only
  the per-kind table asserts the milestone's "cover every node kind".
- [lesson] The compiler is a checklist when `never` is unmuzzled:
  `Type 'A | B | C' is not assignable to type 'never'` enumerates
  remaining work. Discriminant tags are data pinned by parser tests and
  cost to rename; interface names are compile-time-only and cheap —
  `VarDeclStmt`/`"VarDecl"` is a first-commit fossil (git-bug `0e1bf3b`).
- [process] Gates after every edit, including deletions: removing dead
  overrides orphaned two type imports and turned typecheck red after a
  fully green run.

## Failed Approaches (reverted)

- `visits` counter on the production `Analyser` — instrumentation in the
  wrong pocket; replaced by the test-file subclass.
- `@ts-ignore` over the `never` assignment — silenced the exhaustiveness
  check instead of heeding it; reverted.
- Event emission for traversal observability — Observer-pattern ceremony
  for exactly one listener; collapsed into direct per-kind method calls.

## Verification

- `pnpm test`: 118 total, 117 pass, 1 existing todo (returns milestone).
- `pnpm typecheck`, `pnpm lint`, `pnpm fmt:check`: clean.

## Current State

Milestone complete; committed on `main` through `93fe556` (feat `40f270f`,
test `47c9457`). Next: `docs/milestones/semantic-variables-assignments-shadowing.md`,
whose rules land in the per-kind handlers and which finally consumes
`reservedNames` at declaration sites. The `analyseSource` harness and
counting `TestAnalyser` are the test infrastructure for all analyzer
milestones ahead.
