<!-- ABOUTME: Records the diagnostic formatter and caret rendering work. -->
<!-- ABOUTME: Covers error shape decisions, CLI stack-trace fix, environment-pinned subprocess tests, and the caret alignment bug. -->

# Diagnostic Formatter, CLI Boundary, and Caret Rendering

## Summary

Continued `docs/milestones/source-locations-diagnostics.md`. Built the diagnostic formatter as a pure function, unified error positions, wired the CLI so no expected error prints a stack trace, and rendered the spec's source-excerpt-and-caret output. Deferred context lines and secondary spans to a new enhancements milestone.

## Decisions

- [decision] `GicError` carries a position (`line`, `start`, `end`), not a token. Lexer errors are failures to _produce_ a token — a synthetic token would be a lie. `ParserError` keeps its token: a parser error's subject genuinely is a token, and tests asserting `error.token?.lexeme` verify the parser failed at the right one. Uniformity comes from both classes exposing `line`/`start`/`end` fields, not from both holding tokens.
- [decision] Dropped the Crafting Interpreters `where` clause ("at end", "at 'loop'"). With real line/column it is redundant and produced awkward output ("Error at end line 2, column 1"). Format is now the spec shape: `Error at line X, column Y:` + excerpt + caret + message.
- [decision] The formatter is a pure `(error, source) → string` function in `message-formatter.ts`. `main.ts` catches both error types, prints, exits
  1. The 1-based conversion lives in exactly this one place (gate 1).
- [decision] `report()` derives line and column from the offset via `locate()` — one source of truth. It does not accept a `line` parameter; a passed-in line and a computed line could silently disagree.

## Insights

- [lesson] `assert.match` with a regex containing `[...]` is a character class, not literal text — `/[Line 2 Column 1]/` never matches the literal header. Use `strictEqual` when pinning an exact format; `match` is for patterns.
- [lesson] Subprocess tests inherit the ambient environment. `FORCE_COLOR` in Fabian's shell made `styleText` emit ANSI codes in a piped subprocess, so the CLI test failed for him and passed for the agent's shell. Pin the subprocess env: `env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" }`. And `env` _replaces_ the environment — spread `process.env` or the child loses `PATH` and `node` may not even resolve.
- [lesson] Caret alignment bug passed all tests because each test varied only one variable: width-4 token at column 0, width-1 token at column 3. The combination (multi-char token at column > 0) was untested and broken. Cover the combination space, not just the axes. The fix simplified the code: `" ".repeat(column) + "^".repeat(Math.max(1, end - offset))`.
- [technique] `locate()` walks the source once: count newlines before the offset for line/lineStart, then `source.indexOf("\n", lineStart)` for lineEnd (-1 → `source.length`). Returns `{line, column, lineStart, lineEnd}`. No column counter in the lexer; column is always derived.
- [lesson] Agent asserted the caret formula was still broken from a stale diff in context; Fabian had already fixed it. Look at the working tree before claiming state — "look before guessing."

## Deferred

- Context lines in diagnostics (error line is empty for EOF-after-newline, caret under nothing) → git-bug `2e6b272`.
- Secondary spans for unclosed delimiters (point at the opening `{`, rustc style) → `docs/milestones/diagnostic-enhancements.md`, pairs with the AST-locations decision.

## Current State

- 86 tests: 85 pass, 1 todo (the analyzer return-semicolon test, still correctly deferred). All gates green. Working tree clean, all pushed by Fabian.
- Commits this session: error-shape unification, real positions in `GicError`, formatter extraction + tests, `where` removal, CLI no-stack-trace test, caret rendering, enhancements milestone doc.
- Milestone remaining: decide whether AST nodes carry source locations; record the resolved decision gates in the milestone doc.
- git-bug: `0885b28` (documentation comments) still open; `2e6b272` (context lines) open. Fabian pushes `git-bug` himself — sandbox blocks SSH.

## Milestone Completion: AST-Locations Decision

The last open item was whether AST nodes carry source spans. Surfaced the matter concretely with a tiny example (`a + b`) to separate three kinds of pointing: a single token (stored), a whole expression (computed from first-token.start to last-token.end), and an empty position (EOF).

Decision: AST nodes retain their significant tokens (name, operator, paren), which already carry spans — enough to underline a name (shadowing), a paren (arity), or an operator (runtime type errors), covering every spec example. Full per-node spans are an additive extension: a `Span` field on AST interfaces with the parser computing `[first-token.start, last-token.end)` per node. It needs no rework of existing tokens or errors and breaks no tests — deferring costs nothing.

Recorded in three places:

- `docs/milestones/source-locations-diagnostics.md` Decision Gates plus the checklist item marked decided.
- `docs/milestones/diagnostic-enhancements.md` gains a "Full per-node AST spans" enhancement section alongside context lines and secondary spans.
- `docs/MEMORY.md`.

## Summary

The Source Locations and Diagnostic Quality milestone is complete. Internals are 0-based; display is 1-based with conversion in exactly one place (the pure formatter). Tokens carry half-open spans; EOF is an empty span. Errors are thrown inside and converted at the CLI boundary — no stack traces for expected language errors. The formatter renders the spec shape: header, source excerpt, caret, message. `GicError` carries a position, `ParserError` carries the offending token; both expose `line`/`start`/`end`.

Deferred to `diagnostic-enhancements.md`: context lines (git-bug `2e6b272`), secondary spans for unclosed delimiters, and full per-node AST spans.

Next per curriculum order: browser-neutral core API.
