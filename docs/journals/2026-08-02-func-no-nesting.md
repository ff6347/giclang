<!-- ABOUTME: Records the session that made the parser reject nested function declarations. -->
<!-- ABOUTME: Preserves the spec-aligned decision, the boolean-to-counter bug, and the open plan conflict. -->

# Reject Nested Function Declarations

## Summary

Made the GIC parser error when a `func` declaration appears inside any block
(function, `if`, `repeat`), enforcing that functions may only be declared at
the top level. This aligns the parser with the Language Specification rev 2
scoping model.

## Work Completed

- Reviewed the existing `parser.func.test.ts` on the `test/func-nested`
  branch; found the second test asserted a wrong expected AST copied from the
  first test.
- Confirmed against `docs/Language specification rev 2.md` that only two
  scopes exist (Global, Function-local), there are no nested-function scopes,
  and the "No closures" rule applies. Functions are only ever shown at the top
  level in the spec.
- Rewrote the bogus test into "should throw on function declaration within
  function", asserting `parser.parse()` throws a `ParserError` whose
  `.token.lexeme` is `"func"` with the message
  `Unexpected 'func'. Functions can only be declared at the top level.`
- Added error tests for `func` inside `if` and inside `repeat`.
- Implemented the guard at the `FUNC` match site in `statement()`.
- First implementation used a boolean `insideBlock` flag.
- Identified that a boolean flag is unsound for nested blocks: the inner
  `block()` closing the `}` of an `if` inside a `repeat` resets the flag to
  false, so a subsequent `func` in the outer `repeat` body would slip through.
  The single-level tests did not catch this.
- Added a regression test "should throw on function declaration within repeat
  block with valid block" (an `if` block nested in the `repeat` body, then a
  `func`) that fails under the boolean and passes under a counter.
- Replaced the boolean with a numeric `blockDepth` counter: increment on
  entering each block (`funcStatement`, `repeatStatement`, `ifStatement`
  then-branch, `ifStatement` else-branch), decrement at the end of `block()`.
- Verified the counter balances: each increment is paired with exactly one
  `block()` call; the else-if path recurses into `ifStatement` with its own
  balanced increment and `block()`; error paths throw at `consume(RIGHT_BRACE)`
  before the decrement so depth never underflows.
- All 56 tests pass; `tsc`, `oxlint`, and `oxfmt --check` are green.

## Decisions and Insights

- [decision] Functions may only be declared at the top level. Nested `func`
  inside a function, `if`, or `repeat` block is a parse error. This matches
  the Language Specification rev 2 flat scoping model and the "No closures"
  rule.
- [lesson] A boolean "am I inside a block" flag is unsound for nested blocks
  because every closing `}` resets it, clobbering the state of enclosing
  blocks. A depth counter survives arbitrary nesting because depth returns to
  the outer level rather than to zero.
- [technique] Regression tests for stateful parser flags should exercise a
  block that opens and closes a nested scope _followed by_ the guarded
  construct in the outer scope. Flat single-level tests do not expose
  reset-on-close bugs.
- [lesson] Match the error surface to existing convention: this project
  throws `ParserError` with a `.token` pointing at the offending token, and
  tests assert via `assert.throws(() => parser.parse(), (error) => ...)`
  checking `error.token?.lexeme` and `error.message` (see
  `src/tests/parser.error.test.ts`).
- [lesson] The ABOUTME header of a test file must track what the file
  actually covers. The header still said "nesting" after nesting became an
  error; a stale ABOUTME misleads readers about test intent.
- [question] `docs/milestones/parser-functions.md` explicitly lists nested
  function declarations as something the parser should accept (Included:
  "Nested function declarations as permitted by the grammar"; Concepts:
  "Nested function declarations parse as statements inside function bodies;
  later lessons decide their meaning"; Tests: "Nested function
  declarations"). This session implemented the opposite. The Language
  Specification rev 2 supports the decision, so the milestone is superseded
  by a spec-aligned choice, not fulfilled as written. Open: update the
  milestone to reflect the decision, or remove it as superseded?

## Current State

- On `main`; `feat: Track nesting depth` and the merge of `test/func-nested`
  are committed and pushed. Working tree clean.
- 56 tests pass; typecheck, lint, and format all green.
- git-bug `0885b28` (documentation comments) remains open and untouched;
  not related to this session.
- `docs/milestones/parser-functions.md` contradicts the implemented
  behavior and needs Fabian's decision on how to reconcile it.
