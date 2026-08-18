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
- [decision] Reserved names = the ten keywords plus every built-in registry
  key, constants included. The analyzer enforces them at declaration sites;
  the lexer never rejects names because it sees occurrences, not
  declarations. Keywords self-enforce through the grammar (a declaration
  expects IDENTIFIER and finds a keyword token).
- [decision] Color functions `fill`, `stroke`, and `background` share three
  signatures: string (hex/CSS), OKLCH triple, OKLCH+alpha quad — per the
  Colors prose, not the per-function tables. `print` accepts string,
  number, or boolean as three unary signatures.
- [decision] `frameRate` and `frameCount` are deferred to animation work;
  `frameCount` is a read-only value, not a function, per the spec.

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
- [decision] The browser-neutral public language entry point is `src/core.ts`;
  its explicit name distinguishes reusable language work from the Node CLI in
  `src/main.ts`.
- [decision] `Token` and `TokenType` remain internal until a public core
  tokenization operation returns them; exporting types without a corresponding
  operation would enlarge the API without serving a caller.
- [decision] `parseSource(source)` returns a discriminated `ParseResult` with
  `diagnostics` on both branches: success has `ok: true` plus a `Program`, while
  failure has `ok: false`. Keeping diagnostics present on success leaves room
  for future warnings without changing the public result shape.
- [decision] Core diagnostics are structured `message`/`line`/`start`/`end`
  data, not formatted output. The core converts expected `GicError` and
  `ParserError` exceptions into results, rethrows unexpected implementation
  errors, and leaves presentation to CLI, browser, or tooling consumers.
- [lesson] A public shape with `ok: boolean` and `program?: Program` permits
  contradictory states. Literal boolean branches enforce the success invariant
  and allow TypeScript to narrow `program` safely.

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
- [decision] Program-level position rules (e.g. "loop must be the last
  top-level construct") are enforced in `parse()` by mirroring the grammar
  production (`program = statement* loopBlock?`): parse declarations while
  `!isAtEnd() && !check(LOOP)`, then parse one optional loop, then require
  EOF. `statement()` keeps only the nesting guard; it never dispatches the
  loop tail.
- [lesson] `statement()` runs for every statement at every depth, including
  inside blocks via `block()`. A check placed there cannot observe
  top-level position, and a condition placed after
  `statements.push(declaration())` can never stop the token it checks for.
  Stop conditions belong in the loop condition using `check()` to peek.
- [lesson] Every `block()` call decrements the parser's `blockDepth`; a
  parse path that opens a block without incrementing first drives the
  counter negative and corrupts the nesting guard for the rest of the
  program. Pair increment and `block()` as `funcStatement` and
  `repeatStatement` do.
- [technique] Test simplifiers must attach optional AST fields conditionally
  (the `elseBranch`/`step` pattern); unconditional attachment adds
  `undefined` fields and breaks every test that lacks the construct.
- [lesson] Write metadata-pinning tests from the spec, not from the
  implementation; `deepStrictEqual` protects only what it pins and will
  otherwise lock in spec violations.

## Diagnostics and Error Reporting

- [decision] Location contract: 0-based internally, 1-based user-facing;
  the `+1` conversion happens only in the diagnostic formatter. Spans are
  half-open `[start, end)`. Tokens carry offsets, never columns — column is
  derived at format time.
- [decision] `GicError` carries a position, `ParserError` carries the
  offending token; both expose `line`/`start`/`end` fields, which is all
  the formatter reads. Uniformity through field shape, not shared token
  references.
- [technique] `locate(source, offset)` walks the source once: newlines
  before the offset give line/lineStart, `indexOf("\n", lineStart)` gives
  lineEnd. The caret is `" ".repeat(column) + "^".repeat(Math.max(1, end -
start))` — the `Math.max` covers empty EOF spans.
- [lesson] Pin exact output formats with `assert.strictEqual`, not
  `assert.match` — an unescaped `[...]` in a regex is a character class and
  fails or matches for the wrong reason.
- [lesson] Tests that spawn subprocesses must pin the environment
  (`env: { ...process.env, NO_COLOR: "1", ... }`): ambient variables like
  `FORCE_COLOR` change child behavior per shell. `env` replaces the whole
  environment — spread `process.env` or the child loses `PATH`.
- [lesson] When a function of two variables misbehaves, tests that vary
  only one variable per case hide it — a caret formula wrong for
  "multi-char token at column > 0" passed a suite covering only
  width-or-column, never both. Cover the combination space.

- [decision] AST nodes retain their significant tokens (name, operator,
  paren), which carry spans. Errors point at a single token — enough for
  shadowing, arity, and runtime type errors. Full per-node spans are an
  additive extension, not a prerequisite; revisit only when an error needs
  to underline a whole expression.

## Data Modeling and Types

- [decision] Built-ins live in one registry with a discriminated
  `FunctionEntry | ConstantEntry` union; the `kind` discriminant lets the
  analyzer produce precise errors for wrong-kind usage.
- [lesson] `readonly` does not propagate into nested containers; each layer
  (registry, entry, signatures array, signature) needs its own `readonly`.
- [lesson] `Readonly<Set<T>>` still exposes callable mutators; use
  `ReadonlySet` to omit them. `as const` under an explicit type annotation
  does nothing — express immutability in the annotation itself.
- [lesson] A type predicate is trusted by the compiler, never verified; a
  false one silently corrupts type safety.
- [technique] Classify-then-index: an exhaustive `Record<LiteralUnion, V>`
  refuses arbitrary string indexing, so guard with a `word is Key`
  predicate using `in`, then index safely.
- [technique] Derive lookup data from sources of truth
  (`new Set([...Object.keys(x)])`); hand-copied name lists drift.
- [lesson] Spreading an array into an object literal uses the array's
  indices as keys (`{...["a"]}` → `{"0": "a"}`).

## Semantic Analyzer

- [decision] The analyzer collects diagnostics in a list and returns them;
  it never throws on semantic findings. Throws are reserved for unhandled
  node kinds (implementation bugs), guarded by exhaustive switches whose
  `default` assigns the node to `never` and throws. Collect-many serves
  LSP-style consumers.
- [decision] The walker is a class in the Lexer/Parser shape: switches
  dispatch on node tags to `protected` per-kind methods. Semantic rules
  land inside those methods; tests observe traversal by subclassing them.
  No double dispatch, no visitor interface.
- [lesson] `Program` and `LoopStmt` sit outside the `Statement` union, so
  compile-time exhaustiveness cannot prove full traversal; the loop tail
  needs its own protected seam called from `analyze()`.
- [technique] Prove traversal with a test-file subclass that tallies
  visits per kind in a `Map` (uniform count-then-`super` overrides) and
  pins hand-counted per-kind expectations with `deepStrictEqual`. A grand
  total cannot assert per-kind coverage.
- [lesson] An override that wraps must call `super` or observation alters
  behavior; a super-less `onLogical` override silently stopped the walk
  (5 nodes lost under one `&&`).
- [lesson] An assertion green under both a correct and a broken
  implementation proves nothing; make the effect observable (walk the
  loop, unmuzzle the `never` check, count the visits).

## Issue Tracking

- [technique] `git-bug push` fails when the SSH agent has no identities
  (go-git only tries the agent). Confirmed fallback: system Git pushes
  fine via key files — `git push origin 'refs/bugs/*:refs/bugs/*'
'refs/identities/*:refs/identities/*'`. The SourceHut remote has no
  git-bug bridge.
