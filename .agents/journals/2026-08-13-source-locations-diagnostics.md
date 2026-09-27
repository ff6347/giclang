<!-- ABOUTME: Records the source-location and diagnostics milestone work in progress. -->
<!-- ABOUTME: Captures the location contract decisions, the EOF span bug, and the formatter design direction. -->

# Source Locations and Diagnostics (In Progress)

## Summary

Started `docs/milestones/source-locations-diagnostics.md`. Resolved the location-contract decision gates, added offset spans to tokens, fixed a stale-position EOF bug, and began the diagnostic formatter. Work is **not committed** — one formatter test is red.

## Decisions (the milestone's Decision Gates, resolved)

- [decision] Locations are 0-based internally, 1-based user-facing. The `+1` conversion happens in exactly one place: the formatter at the CLI boundary. (Common practice: LSP is 0-based; Rust/GCC display 1-based.)
- [decision] Spans are start-inclusive, end-exclusive (`[start, end)`), same as `String.slice` and LSP ranges.
- [decision] Errors are thrown inside (lexer/parser), converted at the boundary. The spec's "no stack traces" rule is a CLI concern.

## Work Completed

- Added `start`/`end` offset fields to `Token`; `line` became 0-based internally. The lexer already tracked both numbers (`this.start`, `this.current` — the lexeme is `substring(start, current)`), so the change was passing them into the constructor at every `new Token(...)` site.
- Fixed the EOF span bug: the scan loop exits without updating `start = current`, so EOF inherited the previous token's span (`;` at `[9,10)` instead of `[10,10)`). Fix: `this.start = this.current` before pushing EOF, giving an empty span at end of input.
- Wrote `lexer.source-location.test.ts`: single-line spans, EOF on empty input, EOF after trailing newlines, multi-line token positions. Committed as `8234c93 feat(lexer): add token source spans` plus follow-ups.
- Updated existing lexer tests to 0-based lines intentionally (the milestone's "location contract change" clause).

## Work In Progress (uncommitted)

- `error.ts`: unified the error shapes — `GicError` constructor reordered to `(message, token | number)` and `ParserError` now also carries `line`/`start`/`end`, so the formatter sees one diagnostic shape. **Open smell I flagged and Fabian has not resolved**: when `GicError` gets a plain line number, `start`/`end` are set to that line number — fabricated position data. The lexer throw sites (`Unexpected character` etc.) still pass only a line.
- `message-formatter.ts` (new): pure `(error, source) → string` formatter — the testable core; `main.ts` will shrink to catch → format → print → exit. Uses the line/column derivation: count newlines before the offset; `column = offset - lineStart`.
- `main.ts`: `report()` passes spans through but still prints the raw 0-based line (`[Line ${line}]`) and still doesn't catch `ParserError` (`else { throw e }` → stack trace). Both are milestone checklist items.
- `parser.error.test.ts`: added a "parser diagnostics" test asserting the error token's line and span for a missing-`(` case. Green.
- **Currently red**: `message-formatter.test.ts` "should write report" — the assertion regex has a double space (`Error  at 'loop'`) but the formatter emits a single space. Trivial mismatch to fix.

## Insights

- [lesson] "Token tracking" was already there: the lexer's `start`/`current` indices are the span. The design question was only whether `Token` stores them.
- [lesson] EOF assertions pinned a bug because they were written to match the implementation, not the contract. Work expected offsets out on paper first (`let x = 0;` → `let` is `[0,3)`, not `[0,4)`).
- [lesson] Offset vs column: offsets are absolute and never reset per line; column is derived (`offset - lineStart`). Fabian initially expected EOF's start to reset to 0 on a new line — it can't, or offsets would be ambiguous.
- [technique] Assert `tokens.length` before indexing — Fabian's multi-line test indexed `tokens[5]` expecting EOF but got the second `let`; a length assertion forces the count to be explicit.
- [lesson] Do not bake location into parser error message strings: the data is already on the token, the parser never sees the source (cannot compute columns), and it would violate the single-conversion-site rule.
- [technique] Make the formatter a pure `(source, diagnostic) → string` function. Testing through `main.ts` means capturing console and intercepting `exit()`; a pure function is string-in/string-out.

## Current State

- Uncommitted: `error.ts`, `lexer.ts`, `main.ts`, `parser.error.test.ts` modified; `message-formatter.ts` + test file untracked. 80 tests, 1 red (formatter regex spacing).
- Committed and pushed through `01ca5ae test(lexer): add assert for other tokens`.
- Milestone checklist remaining: parser diagnostics location tests (started), multi-line diagnostic formatting consistency, AST-nodes-carry- locations decision (still open), CLI no-stack-traces (ParserError uncaught), report() 1-based conversion.
- git-bug `0885b28` (documentation comments) remains open and untouched.
