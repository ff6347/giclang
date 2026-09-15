<!-- ABOUTME: Guides engineering agents delivering the GIC language and workshop application. -->
<!-- ABOUTME: Defines project structure, architecture boundaries, TDD, commands, and completion rules. -->

# GIC Engineering Guide

## Operating Mode

GIC is an active implementation project. Work directly and pragmatically:
inspect the current state, make the requested change, verify it, document durable
knowledge, and push it. Do not slow normal engineering work into a teaching
exercise.

The optional teaching behavior lives in `.agents/skills/tutor/SKILL.md`. Load it
only when Fabian explicitly asks for tutoring or when work concerns the product's
Socratic tutor policy. It is not the default implementation mode.

## Product Direction

The v0.9 release target is a workshop-ready static generative-graphics
environment:

- a browser-neutral TypeScript language core;
- stable `gic check` and headless `gic run` commands;
- a shared Monaco and Canvas IDE;
- an installable tutor-less offline PWA;
- a dedicated-window desktop application; and
- an optional, isolated Socratic tutor.

Static authoring is the release gate. Animation is a stretch goal and must not
block v0.9.

Start product work from git-bug parent `60b2077` and its dependency-linked child
issues. The accepted delivery order is in
`docs/plans/vertical-slice-roadmap.md`.

These are delivery targets, not claims that every surface exists. The current
CLI source supports only `node src/main.ts <script>`, parses source, and prints
the AST; package metadata does not yet expose a `gic` executable. Git-bug issues
`a39002a` and `faad1fb` introduce the v0.9 `check` and `run` contracts.

## Sources of Truth

Use the narrowest applicable source:

1. The assigned git-bug issue defines the deliverable and acceptance criteria.
2. `docs/Language specification.md` defines active language semantics.
3. Accepted records under `docs/decisions/` define architecture and scope.
4. Tests define behavior already promised by the implementation.
5. `docs/MEMORY.md` contains durable implementation lessons and decisions.
6. Recent files under `docs/journals/` provide context, not current authority.

Files under `docs/deprecated/` are historical. Do not use them to override the
active specification. If these sources conflict, stop and present the conflict
to Fabian rather than choosing silently.

## Repository Map

This is one pnpm package, not a monorepo.

- `src/` — reusable language modules plus the Node CLI entry point.
  - `lexer.ts`, `parser.ts`, `ast.ts` — source to AST.
  - `analyzer.ts`, `scope.ts`, `analyser-diagnostics.ts` — semantic analysis.
  - `interpreter.ts`, `environment.ts`, `callable-registry.ts` — execution.
  - `built-ins.ts`, `draw.ts`, `math.ts` — shared built-in metadata and behavior.
  - `commands.ts`, `output.ts` — serializable drawing and `print` results.
  - `core.ts` — public host-neutral `parseSource` and `runSource` boundary.
  - `main.ts` — Node CLI entry point.
- `src/tests/` — core, parser, analyzer, interpreter, formatter, and CLI tests.
- `browser/` — Vite application rooted at `browser/index.html`.
  - `browser/src/worker.ts` runs the shared core away from the UI thread.
  - `browser/src/render-to-canvas.ts` interprets drawing commands on Canvas.
  - Browser-local `*.test.ts` files test pure browser adapters.
- `e2e/` — Playwright Firefox tests of visible editor and Canvas behavior.
- `examples/` — real `.gic` programs used as product examples and selected
  acceptance fixtures.
- `docs/decisions/` — architecture decision records.
- `docs/milestones/` and `docs/LESSONS.md` — capability definitions and the
  completion ledger.
- `docs/plans/` — active delivery plans; remove a plan once completed.
- `docs/journals/` — append-only session records.
- `.agents/skills/` — optional project skills, including tutor behavior.

Do not recreate the stale structure described by historical documentation. Read
the working tree before adding or moving modules.

## Architecture Invariants

- Keep reusable language modules imported by `core.ts` independent of DOM,
  Canvas, Monaco, workers, desktop shells, provider APIs, and the Node-only CLI.
- GIC uses a tree-walking interpreter. Never evaluate GIC source as JavaScript.
- `runSource` is the shared parse → analyze → execute path. Hosts format and
  present its plain result; they do not duplicate language logic.
- Drawing behavior crosses host boundaries as an ordered, serializable
  `Command[]`. `print` crosses as structured `OutputEntry[]`.
- Expected GIC failures become structured diagnostics. Unexpected implementation
  failures must still throw; do not disguise bugs as user diagnostics.
- Internal locations are zero-based half-open offsets. Convert to one-based
  display positions only at presentation boundaries.
- Built-in names, signatures, parameter names, return kinds, and constants come
  from the shared built-in registry. Do not maintain host-specific copies.
- Worker messages must remain structured-clone-safe plain data.
- Every preview owns a disposable worker. New source terminates the previous
  worker, stale callbacks are ignored, and timeout clears stale Canvas output.
- The Canvas renderer consumes commands in source order and owns render-local
  style state. Language execution never imports Canvas.
- Preserve strict TypeScript settings and discriminated unions. Do not weaken
  types to avoid modeling a state correctly.
- Do not add LSP, server rendering, CLI image export, or animation behavior by
  implication; each has an explicit issue or decision gate.

## Package and Runtime Commands

Use the versions declared in `mise.toml` and pnpm for dependency changes.

| Command                             | Purpose                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `mise install`                      | Install the declared Node and pnpm toolchain.                                     |
| `pnpm install --frozen-lockfile`    | Reproduce dependencies without changing the lockfile.                             |
| `pnpm test`                         | Run the core `src/tests/*.test.ts` suite with normal diagnostics.                 |
| `pnpm test:compact`                 | Discover all Node tests, including browser-local unit tests, with compact output. |
| `pnpm typecheck`                    | Type-check the platform-neutral Node core.                                        |
| `pnpm typecheck:browser`            | Type-check the DOM/Vite browser application separately.                           |
| `pnpm lint`                         | Run oxlint correctness and project rules.                                         |
| `pnpm fmt:check`                    | Verify oxfmt formatting without modifying files.                                  |
| `pnpm format`                       | Format supported files. Review the resulting diff.                                |
| `pnpm build:browser`                | Build production browser assets with Vite.                                        |
| `pnpm dev:browser --host 127.0.0.1` | Run the browser application locally.                                              |
| `pnpm test:e2e`                     | Run the visible Firefox acceptance path through Playwright.                       |

Run focused tests during red/green work, for example:

```bash
node --test src/tests/interpreter.functions.test.ts
node --test browser/src/color-conversion.test.ts
pnpm exec playwright test e2e/static-preview.spec.ts
```

Do not edit dependency versions by hand. Use pnpm with `--save-exact` when adding
a package.

## TDD and Delivery Workflow

TDD is required when an agent implements executable features and bug fixes. If
Fabian has already written behavior before coverage exists, review the current
implementation directly and add regression coverage; do not discard working code
merely to recreate a red step.

1. Read the complete issue, its blockers, relevant decisions, and current code.
2. Express the narrow user-visible behavior as a failing source-level,
   process-level, or browser acceptance test.
3. Run it and confirm that it fails for the intended reason.
4. Add only enough focused tests to isolate the behavior.
5. Implement the smallest change that makes the acceptance path pass.
6. Refactor only after green, preserving external behavior.
7. Run every affected quality gate and inspect all output.

Testing conventions learned from this repository:

- Prefer explicit named GIC source programs and exact result assertions over
  dense table-driven semantic tests.
- Test through `parseSource` or `runSource` when behavior spans language layers.
- Parser tests may simplify token-heavy ASTs for readability, but focused tests
  must pin significant tokens and source locations when those are the contract.
- Analyzer tests collect all independent findings; do not stop traversal after
  the first diagnostic unless the syntax prevents further analysis.
- CLI tests spawn the real command and pin stdout, stderr, environment, and exit
  status. Disable ambient color when asserting diagnostics.
- Browser E2E tests drive the real editor, worker, and Canvas. Assert visible
  behavior or pixels, not test-only DOM markers.
- Canvas edge pixels are antialiased. Use exact colors only for fully covered
  pixels; use visible difference for stroke edges.
- Do not mock the parser, analyzer, interpreter, worker protocol, Canvas, or file
  storage in an end-to-end test. Tutor integration tests use a deterministic
  provider implementation, while separate real-login smoke checks verify each
  supported provider.
- Expected errors must be captured and asserted so test output stays clean.
- Keep short GIC programs near the test that explains them. Use `examples/` only
  when the shipped example itself is the acceptance contract.

Declarative-only changes do not need artificial tests. Validate them with the
relevant parser/tool, formatting check, build, link inspection, or direct review.

## Quality Gates

For core or CLI changes, run at minimum:

```bash
pnpm test
pnpm test:compact
pnpm typecheck
pnpm lint
pnpm fmt:check
```

For browser-facing changes, also run:

```bash
pnpm typecheck:browser
pnpm build:browser
pnpm test:e2e
```

For documentation-only changes, run `pnpm fmt:check`, `git diff --check`, and
verify every changed local link. Do not claim a browser check passed if the
sandbox prevented Playwright from launching; run it in an environment with the
required capability or report the block.

## Documentation and Project Memory

- Keep durable semantics in the active specification or an accepted decision,
  not only in an issue or chat.
- Journals are append-only. Add tagged observations such as `[decision]`,
  `[lesson]`, `[risk]`, `[technique]`, and `[question]`.
- Curate reusable conclusions into `docs/MEMORY.md`; remove obsolete memory
  rather than appending contradictory guidance.
- Treat “current state” sections in old journals as historical checkpoints.
- Update `docs/LESSONS.md` only when every criterion of a milestone is complete.
- Created files begin with two `ABOUTME:` comment lines where their format
  supports comments.
- Preserve Fabian's personal learning comments unless the task explicitly asks
  to review them.

## Issues and Completion

Publish project work as git-bug objects. The configured bridge synchronizes
those objects; do not create a second independent set of GitHub issues. Follow
the git-bug skill for every mutation.

A change is complete only when:

- its issue acceptance criteria are met;
- required behavioral coverage exists and has been run;
- affected tests, types, lint, formatting, builds, and E2E checks pass;
- diagnostics and test output are clean;
- durable decisions and journal context are updated;
- the completed git-bug issue is closed and synchronized;
- commits are atomic and pushed; and
- the working tree contains no uncommitted work from the change.
