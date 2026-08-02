<!-- ABOUTME: Stores durable technical decisions and lessons for the GIC language project. -->
<!-- ABOUTME: Consolidates journal insights by topic for future development sessions. -->

# Memory

## Language Design

- [decision] Language specification revision 2 is the current specification;
  revisions 0 and 1 are historical references.
- [decision] Functions may only be declared at the top level. A `func`
  inside a function, `if`, or `repeat` block is a parse error (`Unexpected
'func'. Functions can only be declared at the top level.`). This matches
  the rev 2 flat scoping model: only Global and Function-local scopes exist,
  and the "No closures" rule applies.
- [decision] GIC examples use camelCase for variables and functions and
  uppercase names for constants, while underscores remain valid in identifiers.
- [lesson] Creative-coding algorithms involving proximity graphs, particles,
  trails, or palettes require retained collections; remembering only the
  previous generated value changes their behavior.
- [question] Design a minimal dynamic list before imports. Required operations
  likely include creation, append, indexed read, indexed replacement, and
  length; nested-list support remains undecided.
- [question] Decide whether common Processing-style helpers such as `dist()`
  belong in the built-in math API.
- [question] Documentation comments should use a small GIC-specific format,
  not full JSDoc compatibility. Define syntax, declaration association,
  metadata, and IDE presentation before implementation.

## Runtime and Editor Architecture

- [direction] Favor browser Canvas as the primary visual runtime while keeping
  the TypeScript lexer, parser, analyzer, and interpreter platform-neutral.
- [technique] Use a recording render backend for deterministic interpreter
  tests before connecting execution to a real Canvas backend.
- [direction] The existing `ff6347/p5-code-sandbox` Monaco-and-iframe design is
  a candidate foundation for the GIC editor; Deno Desktop is a candidate shell
  for filesystem access and desktop distribution.
- [direction] Treat Node-based image rendering as an optional export, CI, or
  dataset tool rather than the primary execution environment.

## Parser and Tests

- [lesson] When `consume()` cannot find a required token, attach the current
  unexpected token from `peek()` to `ParserError`; `previous()` points before
  the failure.
- [technique] Organize parser tests by grammar responsibility: variables,
  expressions, precedence, conditional statements, and parser errors.
- [technique] Parser tests simplify token-bearing AST nodes into plain values so
  expected trees remain readable while production AST nodes retain tokens.
- [lesson] Grammar positions declared as `IDENTIFIER` (repeat loop variable)
  must be consumed as `Token`s, not parsed as `Expression`s; otherwise invalid
  loop variables like `1 + 2` parse syntactically.
- [lesson] Under `exactOptionalPropertyTypes`, optional AST fields cannot be
  assigned `undefined` explicitly. Build the node, then conditionally assign,
  or use `Record<string, unknown>` in test simplifiers.
- [lesson] `peek()` never advances. Check-and-parse sequences must use
  `match()` or an explicit `advance()`, or the parser starts on the token it
  just inspected.
- [technique] `consume()` only expresses "expected one token type". For
  alternatives (`,` or `)` after repeat end), throw `ParserError` directly
  with `this.peek()` and a message naming the missing delimiter.
- [lesson] A boolean "am I inside a block" flag is unsound for nested blocks
  because every closing `}` resets it, clobbering the state of enclosing
  blocks. Use a numeric depth counter instead so depth returns to the outer
  level rather than zero on close.
- [technique] Regression tests for stateful parser flags should exercise a
  block that opens and closes a nested scope followed by the guarded
  construct in the outer scope; flat single-level tests do not expose
  reset-on-close bugs.

## Issue Tracking

- [risk] The repository uses a SourceHut Git remote without an external
  git-bug bridge. If `git-bug push` cannot use the SSH agent, Git can push
  `refs/bugs/*` and `refs/identities/*` to preserve the distributed issues.
