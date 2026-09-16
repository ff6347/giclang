<!-- ABOUTME: Stores durable technical decisions and lessons for the GIC language project. -->
<!-- ABOUTME: Consolidates journal insights by topic for future development sessions. -->

# Memory

## Language Design

- [decision] `docs/Language specification.md` is the stable active specification path; its frontmatter identifies revision 2.2, while revisions 0 through 2.1 are historical references under `docs/deprecated/`.
- [decision] Functions may only be declared at the top level. A `func` inside a function, `if`, or `repeat` block is a parse error (`Unexpected 'func'. Functions can only be declared at the top level.`). Function declarations remain global-only, and the "No closures" rule applies.
- [decision] Function calls use bare identifier targets for built-ins and user functions. `CallExpr.callee` is an `IdentifierExpr`; the parser rejects literals, grouped expressions, and call results with `Only function names can be called.` at the attempted opening `(`. Arguments remain full expressions, and callable runtime objects are not user-visible values.
- [decision] Every `if`, `else`, `repeat`, and `loop` body introduces a block scope. Declarations do not leak after their block, cannot shadow visible names, and may be reused in separate non-overlapping scopes unless a global declaration reserves the name.
- [decision] GIC examples use camelCase for variables and functions and uppercase names for constants, while underscores remain valid in identifiers.
- [lesson] Creative-coding algorithms involving proximity graphs, particles, trails, or palettes require retained collections; remembering only the previous generated value changes their behavior.
- [question] Design a minimal dynamic list before imports. Required operations likely include creation, append, indexed read, indexed replacement, and length; nested-list support remains undecided.
- [question] Decide whether common Processing-style helpers such as `dist()` belong in the built-in math API.
- [question] Documentation comments should use a small GIC-specific format, not full JSDoc compatibility. Define syntax, declaration association, metadata, and IDE presentation before implementation.
- [decision] Reserved names = the ten keywords plus every built-in registry key, constants included. The analyzer enforces them at declaration sites; the lexer never rejects names because it sees occurrences, not declarations. Keywords self-enforce through the grammar (a declaration expects IDENTIFIER and finds a keyword token).
- [decision] Color functions `fill`, `stroke`, and `background` share three signatures: string (hex/CSS), OKLCH triple, OKLCH+alpha quad — per the Colors prose, not the per-function tables. `print` accepts string, number, or boolean as three unary signatures.
- [decision] `frameRate` and `frameCount` are deferred to animation work; `frameCount` is a read-only value, not a function, per the spec.

## Runtime and Editor Architecture

- [direction] Favor browser Canvas as the primary visual runtime while keeping the TypeScript lexer, parser, analyzer, and interpreter platform-neutral.
- [decision] The interpreter records drawing intent directly into an ordered `Command[]`; this serializable list is the deterministic recording backend consumed by tests and browser Canvas, without a separate mutable backend object.
- [decision] Drawing styles are separate ordered commands rather than snapshots attached to shapes. Reusable `Color` values are tagged as numeric OKLCH or CSS; numeric lightness, chroma, and alpha use inclusive `0`–`100` ranges, while hue uses inclusive `0`–`360`.
- [technique] Browser color conversion preserves GIC alpha percentages by appending `%` in Canvas OKLCH strings and passes validated CSS color strings through unchanged.
- [decision] The static Canvas renderer keeps ordered fill, stroke, enablement, and stroke-width state local to each render. Every preview starts with white fill, black stroke, width `1`, and fill and stroke enabled; `fill` and `stroke` re-enable styles disabled by `noFill` and `noStroke`.
- [decision] Every registered static shape emits a platform-neutral command and has real Canvas coverage: `point`, `line`, `rect`, `circle`, `ellipse`, `triangle`, `quad`, and `arc`.
- [decision] `point(x, y)` is a solid, stroke-colored round dot centered at its coordinate. Its diameter is the current stroke width, and `noStroke()` disables it.
- [decision] `arc(x, y, radius, startAngle, endAngle)` is an open, stroke-only clockwise curve. GIC angles are degrees and the Canvas adapter converts them to radians.
- [technique] Canvas receives a circle radius unchanged, while ellipse width and height become half-width and half-height radii. Closed polygonal shapes use ordered fill and stroke state; points, lines, and arcs use stroke state only.
- [technique] `examples/repeat.gic` is the deterministic Slice 3 fixture. Its nested 20×20 rectangle grid reaches the final row and column near the 100×100 Canvas edge, and Firefox tests load that exact file through the preview UI.
- [technique] `examples/reusable-motif.gic` is the deterministic reusable- function fixture. Firefox loads the exact file and observes line-and-circle motifs from two calls; seeded acceptance separates identical runs with an invalid preview so stale Canvas state cannot create a false positive.
- [decision] Monaco is the v0.9 editor for the shared desktop/PWA UI. The browser shell loads its ESM editor API and worker from locally packaged Vite assets, with GIC Monarch highlighting derived from the shared keyword and built-in registries.
- [decision] Preview execution runs in a dedicated Web Worker with termination for replacement and runaway-program protection. The main thread renders structured output to Canvas; interpreted GIC does not use an iframe.
- [decision] The previous image remains during execution, is replaced only by success for the exact current source, and is cleared on parse, analysis, runtime, or timeout failure. Failed current source also disables PNG export.
- [decision] Playwright drives the shared UI. Direct-`file://` standalone export additionally requires Chromium, Firefox, and WebKit acceptance.
- [decision] Monaco calls a direct browser-neutral service for diagnostics, formatting, completion, hover, and signature help. LSP, VS Code, and go-to-definition remain outside v0.9.
- [decision] `formatSource` formats only parser-valid GIC. It reconstructs line comments from gaps between token offsets, emits tabs and canonical whitespace with a final newline, and returns invalid source unchanged.
- [decision] Monaco's packaged editor feature graph supplies the F1 command palette and applicable editor commands, including Format Document; the single-editor shell focuses Monaco on launch, and no runtime CDN dependency is introduced.
- [direction] Treat Node-based image rendering as an optional export, CI, or dataset tool rather than the primary execution environment.
- [decision] The primary v0.9 distribution is a Tauri 2 dedicated-window desktop app; the secondary edition is a tutor-less offline PWA. Operation-specific native Rust commands own dialogs, files, credentials, and provider calls. Electron is the fallback; Deno Desktop was rejected because it lacked first-class native Open/Save APIs, and no Node sidecar is currently required.
- [decision] Desktop and PWA edit one document at a time. Explicit source saves, immutable example copies, and private recovery snapshots are separate workflows.
- [decision] The optional desktop tutor is a soft dependency and contacts Codex or OpenCode only after explicit submission. Each request receives ephemeral source, diagnostics, runtime failure, and structured output, but no Canvas image.
- [decision] Tutor credentials live outside the webview in an atomically updated app-owned plaintext `auth.json`, restricted to the owner and deleted on sign-out. Credential values never enter logs, exports, prompts, or sessions.
- [technique] The packaged Tauri/Rig spike proved OpenCode Zen and ChatGPT subscription streaming through a provider-neutral Rust event interface. A narrow GIC-owned device-authorization port starts ChatGPT sign-in without sending a completion request, then Rig handles explicit completion streams.
- [lesson] Tauri frontend event listening requires an explicit capability such as `core:event:allow-listen`. Do not block every control on asynchronous listener startup; keep bridge readiness observable and surface failures through credential-safe diagnostics.
- [lesson] Provider model catalogs change faster than general public model pages. Use a maintained curated catalog and retain safe HTTP/provider diagnostics; the spike's live Pi subscription catalog identified `gpt-5.6-luna` after `gpt-5.3-instant` returned an authenticated HTTP 400.
- [decision] The integrated tutor uses canonical Socratic guidance and no write, shell, browser, or web tools. Tutor sessions are transparent local JSONL with append-only compaction checkpoints.
- [decision] The browser-neutral public language entry point is `src/core.ts`; its explicit name distinguishes reusable language work from the Node CLI in `src/main.ts`.
- [decision] `Token` and `TokenType` remain internal until a public core tokenization operation returns them; exporting types without a corresponding operation would enlarge the API without serving a caller.
- [decision] `parseSource(source)` returns a discriminated `ParseResult` with `diagnostics` on both branches: success has `ok: true` plus a `Program`, while failure has `ok: false`. Keeping diagnostics present on success leaves room for future warnings without changing the public result shape.
- [decision] `runSource(source)` composes parsing, analysis, interpretation, command output, and structured print output through a discriminated `RunResult`. Parser or analyzer findings return failure diagnostics without constructing the interpreter or exposing commands.
- [decision] Every `RunResult` carries `output: OutputEntry[]`. Entries contain formatted text and the `print` token's 0-based line plus half-open absolute offsets. Output emitted before a runtime diagnostic survives, while parser and analyzer failures contain an empty output list.
- [technique] `runSource()` owns the output array and injects an output sink into the interpreter. The callback remains inside the worker; only plain structured output crosses the worker boundary.
- [decision] The browser renders and logs each output entry as `Line N: text` before handling the worker result's success or failure branch, so output retained before a runtime diagnostic remains ordered and visible.
- [decision] Interpreter expression results distinguish user-visible `number | string | boolean` values from a unique internal `VOID` symbol. Environments store only user-visible values; command-emitting calls return `VOID` without exposing it to GIC programs.
- [decision] Internal callables live in a separate registry rather than `Environment`. Drawing, print, pure-math, and user callables resolve through one invocation seam; a user callable retains its global `FuncStmt` without becoming a GIC value.
- [technique] User calls evaluate arguments once from left to right, bind them in a fresh global-child environment, and execute against the original command list. This preserves global reads and nearest-owner mutation without closures.
- [technique] An internal `ReturnSignal` propagates unchanged through statement lists, conditionals, and repeats. Only the user-call boundary unwraps it; ordinary statement-list completion returns `undefined`, never a fabricated void signal.
- [decision] `PI`, `WIDTH`, and `HEIGHT` store their runtime values in the shared built-in registry. Identifier evaluation falls back to constant entries after ordinary environment lookup, without placing constants in mutable environments.
- [decision] Math built-ins accept and produce finite numbers. Pure math handlers share one callable kind; `sin` and `cos` consume degrees, `sqrt` rejects negative inputs, and `pow` rejects only non-finite results.
- [decision] Unseeded `random()` uses `Math.random()`. After `randomSeed(n)`, GIC uses p5.js's 32-bit linear congruential generator and unsigned seed coercion; equal or reversed random bounds are errors rather than silently swapped. A factory creates state for each callable registry, and the void seed effect returns the interpreter's internal `VOID` through ordinary callable dispatch.
- [technique] Pass the current `Environment` explicitly through statement and expression evaluation. Declarations write to the current environment, reads search its parent chain, and assignment updates the nearest environment that already owns the name.
- [decision] Repeat ranges use an exclusive end with sign-dependent comparison. Bounds and step evaluate once in the surrounding environment; an omitted step is `1`, an explicit zero step is an error, and a step pointing away from the end performs zero iterations.
- [technique] A repeat execution owns one child `Environment`, updates its iterator each turn, and derives fractional values as `start + turn * step` to avoid accumulated floating-point drift. Assignments still update an existing outer owner through the environment chain.
- [technique] Built-in call arguments are AST expressions, not values. `Interpreter.onCall()` evaluates them exactly once, left-to-right, before dispatch. Drawing functions in `src/draw.ts` accept the resulting values as `unknown`, narrow them through shared guards, and create commands without depending on interpreter types; checking `typeof` on an AST node only sees an object.
- [technique] Keep recursive operand evaluation and internal `VOID` rejection in the interpreter while pure unary/binary application and operator-token diagnostics live in `src/operators.ts`. `applyBinaryOperation()` accepts only the significant `Token`, and `requireNumbers()` centralizes numeric narrowing and source evidence. This boundary keeps the tree walker readable as operator coverage grows.
- [decision] Division and modulo by zero are source-located runtime errors. GIC equality is strict and does not coerce: cross-type `==` is `false`, while cross-type `!=` is `true`.
- [technique] Logical expressions remain in the interpreter because they control AST evaluation. Evaluate and validate the left operand first, return for `false && ...` or `true || ...`, and only then evaluate and validate the right operand. An invalid right expression is an effective test probe for whether short-circuiting actually occurred.
- [lesson] Prefer explicit, named source programs and result assertions for language-semantics tests. A table-driven operator matrix was shorter but made individual GIC behavior harder for humans to read and learn from.
- [preference] Keep GIC source programs local to their E2E tests and duplicate short snippets when that keeps setup, action, and assertion readable together.
- [technique] Playwright drives Monaco through its visible editing surface with `Control+A`, ordinary key events, and Enter between lines. Firefox duplicates the first line when multiline source is sent through bulk `insertText()`.
- [lesson] Canvas antialiasing makes exact edge-pixel color assertions brittle. Stroke geometry tests should assert a visible difference from the background while exact colors are sampled from fully covered pixels.
- [decision] `background`, `fill`, and `stroke` share one runtime color validator. It accepts numeric OKLCH triples and percentage-alpha quads, standard CSS names case-insensitively, and 3-, 4-, 6-, or 8-digit hexadecimal colors; invalid strings produce source-located diagnostics.
- [decision] GIC uses a platform-neutral tree-walking interpreter rather than generating JavaScript. Serializable render commands carry drawing intent to browser Canvas or future adapters; shells do not reimplement language execution.
- [technique] Firefox browser acceptance tests fill the real textarea and compare corner and center Canvas pixels for opacity and visible difference, avoiding test-only DOM markers. Slice 2 acceptance edits a computed variable so an `if` branch stops drawing, then introduces a dynamic operand error and verifies that stale Canvas output clears with a source-located diagnostic.
- [decision] Slice 2 completes the expression, variable/assignment, and conditional interpreter lessons. Keep the broader runtime value/environment lesson open until later slices implement its callable-value and return-signal requirements.
- [technique] Results crossing the Web Worker boundary must be plain data. `core.ts` converts caught `GicError`/`ParserError` instances into `{message, line, start, end}` literals before `postMessage`; structured clone does not preserve class instances for consumer `instanceof` checks.
- [technique] The browser preview keeps a stale-worker guard (`worker !== activeWorker`) in every callback so a timed-out or superseded worker cannot touch the DOM after its replacement starts. A fresh worker is spawned per run after a 100 ms input debounce, with a 500 ms execution timeout.
- [lesson] Playwright Firefox cannot launch inside the nono sandbox (Mach `bootstrap_check_in` denied). Run `pnpm test:e2e` in a regular terminal outside the agent session.
- [decision] Core diagnostics are structured `message`/`line`/`start`/`end` data, not formatted output. The core converts expected `GicError` and `ParserError` exceptions into results, rethrows unexpected implementation errors, and leaves presentation to CLI, browser, or tooling consumers.
- [lesson] A public shape with `ok: boolean` and `program?: Program` permits contradictory states. Literal boolean branches enforce the success invariant and allow TypeScript to narrow `program` safely.

## Parser and Tests

- [lesson] When `consume()` cannot find a required token, attach the current unexpected token from `peek()` to `ParserError`; `previous()` points before the failure.
- [technique] Organize parser tests by grammar responsibility: variables, expressions, precedence, conditional statements, and parser errors.
- [technique] Parser tests simplify token-bearing AST nodes into plain values so expected trees remain readable while production AST nodes retain tokens.
- [lesson] Grammar positions declared as `IDENTIFIER` (repeat loop variable) must be consumed as `Token`s, not parsed as `Expression`s; otherwise invalid loop variables like `1 + 2` parse syntactically.
- [lesson] Under `exactOptionalPropertyTypes`, optional AST fields cannot be assigned `undefined` explicitly. Build the node, then conditionally assign, or use `Record<string, unknown>` in test simplifiers.
- [lesson] `peek()` never advances. Check-and-parse sequences must use `match()` or an explicit `advance()`, or the parser starts on the token it just inspected.
- [technique] `consume()` only expresses "expected one token type". For alternatives (`,` or `)` after repeat end), throw `ParserError` directly with `this.peek()` and a message naming the missing delimiter.
- [lesson] A boolean "am I inside a block" flag is unsound for nested blocks because every closing `}` resets it, clobbering the state of enclosing blocks. Use a numeric depth counter instead so depth returns to the outer level rather than zero on close.
- [technique] Regression tests for stateful parser flags should exercise a block that opens and closes a nested scope followed by the guarded construct in the outer scope; flat single-level tests do not expose reset-on-close bugs.
- [decision] Program-level position rules (e.g. "loop must be the last top-level construct") are enforced in `parse()` by mirroring the grammar production (`program = statement* loopBlock?`): parse declarations while `!isAtEnd() && !check(LOOP)`, then parse one optional loop, then require EOF. `statement()` keeps only the nesting guard; it never dispatches the loop tail.
- [lesson] `statement()` runs for every statement at every depth, including inside blocks via `block()`. A check placed there cannot observe top-level position, and a condition placed after `statements.push(declaration())` can never stop the token it checks for. Stop conditions belong in the loop condition using `check()` to peek.
- [lesson] Every `block()` call decrements the parser's `blockDepth`; a parse path that opens a block without incrementing first drives the counter negative and corrupts the nesting guard for the rest of the program. Pair increment and `block()` as `funcStatement` and `repeatStatement` do.
- [technique] Test simplifiers must attach optional AST fields conditionally (the `elseBranch`/`step` pattern); unconditional attachment adds `undefined` fields and breaks every test that lacks the construct.
- [lesson] Write metadata-pinning tests from the spec, not from the implementation; `deepStrictEqual` protects only what it pins and will otherwise lock in spec violations.
- [lesson] A recursive-descent method named for a precedence level may return several AST kinds. `Parser.call()` remains `Expression` because its no-call path returns any primary; only `finishCall()` and `CallExpr.callee` narrow to `IdentifierExpr`. After matching `(`, `previous()` provides the exact token for rejecting numeric, grouped, or chained call targets.

## Diagnostics and Error Reporting

- [decision] Location contract: 0-based internally, 1-based user-facing; the `+1` conversion happens only in the diagnostic formatter. Spans are half-open `[start, end)`. Tokens carry offsets, never columns — column is derived at format time.
- [decision] `GicError` carries a position, `ParserError` carries the offending token; both expose `line`/`start`/`end` fields, which is all the formatter reads. Uniformity through field shape, not shared token references.
- [technique] `locate(source, offset)` walks the source once: newlines before the offset give line/lineStart, `indexOf("\n", lineStart)` gives lineEnd. The caret is `" ".repeat(column) + "^".repeat(Math.max(1, end - start))` — the `Math.max` covers empty EOF spans.
- [lesson] Pin exact output formats with `assert.strictEqual`, not `assert.match` — an unescaped `[...]` in a regex is a character class and fails or matches for the wrong reason.
- [lesson] Tests that spawn subprocesses must pin the environment (`env: { ...process.env, NO_COLOR: "1", ... }`): ambient variables like `FORCE_COLOR` change child behavior per shell. `env` replaces the whole environment — spread `process.env` or the child loses `PATH`.
- [lesson] When a function of two variables misbehaves, tests that vary only one variable per case hide it — a caret formula wrong for "multi-char token at column > 0" passed a suite covering only width-or-column, never both. Cover the combination space.

- [decision] AST nodes retain their significant tokens (name, operator, paren), which carry spans. `IfStmt` retains its `if` keyword because expressions lack a common location and runtime condition-type diagnostics need source evidence. Errors point at a single token — enough for shadowing, arity, and runtime type errors. Full per-node spans are an additive extension, not a prerequisite; revisit only when an error needs to underline a whole expression.

## Data Modeling and Types

- [decision] Built-ins live in one registry with a discriminated `FunctionEntry | ConstantEntry` union; the `kind` discriminant lets the analyzer produce precise errors for wrong-kind usage.
- [lesson] `readonly` does not propagate into nested containers; each layer (registry, entry, signatures array, signature) needs its own `readonly`.
- [lesson] `Readonly<Set<T>>` still exposes callable mutators; use `ReadonlySet` to omit them. `as const` under an explicit type annotation does nothing — express immutability in the annotation itself.
- [lesson] A type predicate is trusted by the compiler, never verified; a false one silently corrupts type safety.
- [technique] Classify-then-index: an exhaustive `Record<LiteralUnion, V>` refuses arbitrary string indexing, so guard with a truthful `word is Key` predicate (`Object.hasOwn()` when own registry keys matter), then index safely.
- [technique] Derive lookup data from sources of truth (`new Set([...Object.keys(x)])`); hand-copied name lists drift.
- [lesson] Spreading an array into an object literal uses the array's indices as keys (`{...["a"]}` → `{"0": "a"}`).

## Semantic Analyzer

- [decision] The analyzer collects diagnostics in a list and returns them; it never throws on semantic findings. Throws are reserved for unhandled node kinds (implementation bugs), guarded by exhaustive switches whose `default` assigns the node to `never` and throws. Collect-many serves LSP-style consumers.
- [decision] The walker is a class in the Lexer/Parser shape: switches dispatch on node tags to `protected` per-kind methods. Semantic rules land inside those methods; tests observe traversal by subclassing them. No double dispatch, no visitor interface.
- [lesson] `Program` and `LoopStmt` sit outside the `Statement` union, so compile-time exhaustiveness cannot prove full traversal; the loop tail needs its own protected seam called from `analyze()`.
- [technique] Prove traversal with a test-file subclass that tallies visits per kind in a `Map` (uniform count-then-`super` overrides) and pins hand-counted per-kind expectations with `deepStrictEqual`. A grand total cannot assert per-kind coverage.
- [lesson] An override that wraps must call `super` or observation alters behavior; a super-less `onLogical` override silently stopped the walk (5 nodes lost under one `&&`).
- [lesson] An assertion green under both a correct and a broken implementation proves nothing; make the effect observable (walk the loop, unmuzzle the `never` check, count the visits).
- [decision] Global reservation and source-order visibility use separate state: `programGlobalNames` reserves every direct global name, while the scope stack contains only declarations visible at the current source position. A function is inserted immediately before its body so recursion works without hoisting.
- [decision] Scope entries are a discriminated union: variables and repeat variables retain a token, while functions retain a token, arity, and an optional valid `"void" | "value"` return kind. The declaration kind lets assignment reject both user functions and immutable repeat iterators, and lets calls validate arity and value context.
- [lesson] Analyze a variable initializer before registering its declaration, and analyze repeat bounds before registering the iterator. Registration-first ordering incorrectly permits self-reference.
- [lesson] One scope must surround an entire branch or loop body, not each statement. Multi-statement and nested-block fixtures expose push/pop placed inside the statement loop.
- [lesson] An animation `loop` must end the program, so valid source cannot test a loop-local name after the block. Do not encode impossible post-loop behavior in analyzer TODOs.
- [lesson] A callback passed to Node's `test.todo()` still counts as TODO until the call is changed to `test()`.
- [decision] Call resolution uses scope declaration kind for user names and built-in registry kind for GIC names. Variables and built-in constants report `Cannot call '<name>' because it is not a function.`; missing names retain the ordinary missing-name diagnostic. `reservedNames` cannot decide callability because it combines keywords, functions, and constants.
- [decision] User-function calls require exact arity. Built-in function arity is registry-driven: any signature length may match, and accepted arities are deduplicated and sorted for deterministic single or overloaded diagnostics.
- [decision] Built-in signatures pair every ordered value kind with its runtime parameter name. The analyzer filters overloads by arity and accepts one only when all statically known argument kinds match that same candidate.
- [decision] Built-in argument kinds are known only for direct literals and unary minus applied directly to numeric literals. Variables, calls, grouped values, and computed expressions remain unknown for runtime validation.
- [decision] Built-in literal-domain checks run only after arity and kind acceptance. Direct signed literals reject negative `sqrt` inputs, non-finite `pow` results, and `random` bounds where `min >= max`; grouped, call, variable, and computed arguments remain the interpreter's responsibility. Static and runtime checks intentionally share diagnostic wording.
- [lesson] Scope declarations resolve user functions and variables; built-in callability and signatures come from the built-in registry instead.
- [lesson] Call-target or arity diagnostics must not stop traversal of argument expressions; independent argument diagnostics still need collecting.
- [decision] `ReturnStmt.keyword` retains the `return` token so the analyzer can diagnose returns outside functions. Baseline required-return analysis accepts any explicit return in nested statement containers; path-sensitive all-branches checking is deferred to git-bug `a751ee3`.
- [technique] Classify function returns with a pure recursive pre-pass over statements, merging `"none" | "void" | "value" | "mixed"` across `if` branches and repeat bodies. Attach valid return metadata before semantic body traversal so recursive calls see it; analyze return expressions only in the normal walk.
- [decision] Only a direct call expression statement may discard a void result. Initializers, operators, return values, and arguments require values for both user and built-in functions. Built-ins use registry `returnKind` metadata; arity, literal-kind, and literal-domain findings take priority over void-value misuse at the same callee token, while arguments are still traversed.
- [preference] During interactive language work, planning and architecture stay directly between Fabian and the primary agent. The agent writes behavioral tests, while Fabian implements executable behavior; cheaper subagents are limited to precisely specified mechanical test work whose diffs and outcomes the primary agent reviews.
- [preference] If Fabian implements behavior before a test exists, review it directly rather than requiring a red/green replay. Ask before pinning behavior that may be ambiguous or wrong.

## Delivery Planning

- [decision] GIC v0.9 requirements are published as git-bug issue `60b2077`. `docs/plans/vertical-slice-roadmap.md` decomposes the static workshop release into independently testable CLI, Monaco, assistance, layout, document, export, PWA, desktop, workspace, tutor, provider, and packaging slices.
- [decision] Static generative graphics are the v0.9 release gate. Setup/loop lifecycle, animation built-ins, frame scheduling, and Canvas animation remain a stretch slice and cannot block the release.
- [decision] Normal work now uses direct end-to-end engineering ownership for faster application delivery. The project tutor skill applies only when Fabian explicitly requests teaching behavior or when implementing the product's Socratic tutor policy.
- [technique] `pnpm test` runs the core test glob. `pnpm test:compact` uses Node discovery to include core and browser-local unit tests; browser TypeScript, production assets, and Firefox behavior still require their separate typecheck, build, and E2E commands.
- [decision] `gic check` and `gic run` are required v0.9 interfaces over the shared core. `gic run` executes headlessly with ordered `print` output by default; `--commands` instead emits stable drawing-command JSON. Image rendering is deferred to a separate future shell-backend decision, with Skia only a candidate. CLI export, server rendering, watch mode, and `gic lsp` remain out of scope.
- [decision] `docs/LESSONS.md` remains the feature-completeness ledger; vertical slices may implement partial milestone behavior without checking the milestone early.
- [process] Each vertical slice uses a feature branch and starts with a source-level acceptance test, keeps the core browser-neutral, and ends with an experiment, durable documentation, review, atomic commits, and a push. Use a separate worktree only when parallel agents require isolated working trees.
- [preference] Fabian's personal learning comments are intentional working notes; agents preserve them unless he requests comment review or removal.

## Issue Tracking

- [technique] `git-bug push` fails when the SSH agent has no identities (go-git only tries the agent). Confirmed fallback: system Git pushes fine via key files — `git push origin 'refs/bugs/*:refs/bugs/*' 'refs/identities/*:refs/identities/*'`. The SourceHut remote has no git-bug bridge.
