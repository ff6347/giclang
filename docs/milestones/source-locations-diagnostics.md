<!-- ABOUTME: Defines the source-location and diagnostic quality lesson for GIC. -->
<!-- ABOUTME: Teaches consistent lexer, parser, AST, and CLI diagnostic boundaries before analyzer work. -->

# Milestone: Source Locations and Diagnostic Quality

## Learning Goal

Stabilize line and column locations plus user-facing diagnostic messages for lexer and parser failures, creating a consistent boundary for future analyzer errors.

## Prerequisites

Complete or review [the loop-block parser milestone](parser-loop-block.md) and every parser milestone before it:

- [Lexer](lexer.md)
- [Basic parser and AST](parser-basic.md)
- [Expression precedence](parser-expression-precedence.md)
- [Call expressions](parser-call-expressions.md)
- [Assignments](parser-assignment.md)
- [`if` statements](parser-if-statements.md)
- [`repeat` statements](parser-repeat-statements.md)
- [Functions and returns](parser-functions.md)

## Concepts to Understand

- Tokens need stable start positions for line and column reporting.
- EOF should have a meaningful location for missing-token errors at the end of input.
- Parser diagnostics should point at the unexpected token, the missing boundary, or the nearest useful source location.
- Friendly messages should describe what the student can fix, not expose parser internals.
- CLI and core layers may format diagnostics differently, but should share the same diagnostic data.
- Student-facing error output should avoid stack traces for expected language errors.

## Relevant Specification Links

- [Fail Clearly](<../Language specification rev 2.2.md#4-fail-clearly>)
- [Lexer component](<../Language specification rev 2.2.md#1-lexer-lexerts>)
- [Parser component](<../Language specification rev 2.2.md#2-parser-parserts>)
- [Error Message Guidelines](<../Language specification rev 2.2.md#error-message-guidelines>)
- [Parser error journal](../journals/2026-07-29-language-design-and-parser-errors.md)

## Grammar and AST Shape

This is explicitly not a grammar lesson. The boundary shape is token location data plus an optional AST `SourceLocation` or range model. The current AST may not have locations yet, so the exercise is to decide and test the location contract before analyzer work depends on it.

## TDD-Oriented Student Checklist

- Check lexer line and column values for single-line input.
- Check lexer line and column values across blank lines and multi-line input.
- Check EOF location in empty input and after trailing newlines.
- Check parser missing-token diagnostics point to a useful location.
- Check unexpected-token diagnostics name the unexpected token and expected construct.
- Check multi-line diagnostic examples are formatted consistently.
- Add AST range expectations only after deciding whether AST nodes carry source
  locations. **Decided**: AST nodes retain their significant tokens (name,
  operator, paren), which already carry spans. Errors point at a token's span.
  Full per-node spans are an additive extension, not a prerequisite — revisit only
  when an error needs to underline a whole expression.
- Check CLI/core formatting avoids stack traces for expected lexer and parser diagnostics.

## Non-Goals

- No semantic analyzer rules.
- No LSP protocol, editor squiggles, or browser UI.
- No broad parser error recovery strategy.
- No redesign of grammar productions.

## Verification

Use focused lexer and parser diagnostic tests, updating existing tests intentionally when the location contract changes. When code is implemented, run `pnpm test` and `pnpm typecheck`.

## Decision Gates

Resolved during implementation:

- Columns are 1-based for users and 0-based internally. The conversion
  happens in exactly one place: the diagnostic formatter at the CLI
  boundary. (LSP-style; rustc and GCC display 1-based.)
- End positions are exclusive. Spans are half-open `[start, end)`, like
  `String.slice`. Tokens carry `start`/`end` offsets; there is no `column`
  field — column is derived from the offset and source at format time, so
  the lexer needs no column counter.
- EOF gets an empty span `[len, len)`: a meaningful "where more input was
  expected" position.
- Language failures are thrown errors inside (lexer, parser) and converted
  at the public API boundary. The CLI catches both error types, formats
  them, and exits 1 — expected language errors never print stack traces.
- `GicError` (lexer) carries a position `{line, start, end}` — lexer errors
  are failures to produce a token, so carrying one would be a lie.
  `ParserError` carries the offending token, which is the subject of the
  error. Both classes expose `line`/`start`/`end`; the formatter reads only
  those fields.
- The formatter is a pure `(error, source) → string` function
  (`message-formatter.ts`). `report()` derives line and column from the
  offset via `locate()` — one source of truth, no `line` parameter.
- The Crafting Interpreters `where` clause ("at end", "at 'loop'") was
  dropped; real locations make it redundant. Output matches the spec shape:
  `Error at line X, column Y:` + source excerpt + caret + message.
- AST nodes retain their significant tokens (name, operator, paren), which
  carry spans. Full per-node spans (`[first-token.start, last-token.end)`) are
  an additive extension, not a prerequisite — deferred until an error needs to
  underline a whole expression. Adding them later does not require reworking
  tokens or existing errors.
