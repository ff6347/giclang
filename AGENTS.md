<!-- ABOUTME: Defines project-specific instructions for building and testing GIC. -->
<!-- ABOUTME: Summarizes the product aim, repository structure, architecture, and commands. -->

# GIC Project Instructions

## Aim

GIC (Gestalten in Code) is a deliberately small C-style language for creating two-dimensional generative graphics and teaching programming fundamentals. It is inspired by Design by Numbers, Processing, and Lox.

Keep the language and application approachable for beginners. Interactivity, typography, image loading, and general-purpose language features are outside the core direction unless an accepted issue and decision add them.

## v0.9 Scope

The v0.9 target is a workshop-ready static graphics environment:

- a browser-neutral TypeScript language core;
- `gic check` and headless `gic run` CLI commands;
- a shared Monaco and Canvas IDE;
- an installable tutor-less offline PWA;
- a dedicated-window desktop application; and
- an optional Socratic tutor that does not gate core authoring.

Static authoring is the release gate. Animation is a stretch goal and must not block v0.9.

## Sources of Truth

- The assigned git-bug issue defines the requested behavior and acceptance criteria.
- Git-bug parent `60b2077` defines the v0.9 product requirements.
- `docs/plans/vertical-slice-roadmap.md` defines delivery order and dependencies.
- `docs/Language specification.md` defines active language semantics.
- Accepted records in `docs/decisions/` define architecture and scope.
- `docs/MEMORY.md` and recent `docs/journals/` contain implementation context.
- `docs/deprecated/` contains historical specifications and is not authoritative.

## Repository Structure

This is one pnpm package, not a monorepo.

- `src/` — reusable language modules and the Node CLI entry point.
  - `lexer.ts`, `parser.ts`, `ast.ts` — source to AST.
  - `analyzer.ts`, `scope.ts`, `analyser-diagnostics.ts` — semantic analysis.
  - `interpreter.ts`, `environment.ts`, `callable-registry.ts` — execution.
  - `built-ins.ts`, `draw.ts`, `math.ts` — built-in metadata and behavior.
  - `commands.ts`, `output.ts` — serializable drawing and `print` results.
  - `core.ts` — host-neutral `parseSource` and `runSource` API.
  - `main.ts` — Node CLI entry point.
- `src/tests/` — core, parser, analyzer, interpreter, formatter, and CLI tests.
- `browser/` — Vite application rooted at `browser/index.html`.
- `browser/src/content.ts`, `content-model.ts`, `markdown-content.ts` — product-content discovery, validation, and trusted Markdown compilation.
- `browser/src/worker.ts` — runs the shared core away from the UI thread.
- `browser/src/render-to-canvas.ts` — renders drawing commands to Canvas.
- `browser/src/*.test.ts` — unit tests for browser-specific pure functions.
- `content/` — host-neutral About, documentation, and immutable example bundles for the PWA and desktop application.
- `e2e/` — Playwright Firefox tests of visible browser behavior.
- `docs/decisions/` — architecture decision records.
- `docs/milestones/` and `docs/LESSONS.md` — capability definitions and completion ledger.
- `docs/plans/` — active delivery plans.
- `docs/journals/` — append-only implementation checkpoints.

## Architecture Boundaries

- Keep modules imported by `core.ts` independent of Node, DOM, Canvas, Monaco, workers, desktop shells, and provider APIs.
- GIC uses a tree-walking interpreter; never evaluate GIC source as JavaScript.
- `runSource` owns the shared parse → analyze → execute pipeline. Hosts only adapt and present its result.
- Drawing crosses host boundaries as an ordered, serializable `Command[]`. `print` crosses as structured `OutputEntry[]`.
- Expected GIC failures are structured diagnostics. Unexpected implementation failures still throw.
- Source locations are zero-based half-open offsets internally and become one-based only in presentation layers.
- Built-in names, signatures, parameter names, return kinds, and constants come from the shared built-in registry.
- Worker messages are structured-clone-safe plain data.
- Preview runs use disposable workers. Replacement and timeout must prevent stale results from updating Canvas or diagnostics.
- Canvas rendering consumes commands in source order and owns render-local style state; language execution never imports Canvas.
- Core and browser TypeScript projects remain separately type-checked.

## Commands

Use the Node and pnpm versions declared in `mise.toml`.

| Command | Purpose |
| --- | --- |
| `mise install` | Install the declared toolchain. |
| `pnpm install --frozen-lockfile` | Install locked dependencies. |
| `pnpm test` | Run `src/tests/*.test.ts`. |
| `pnpm test:compact` | Discover core and browser-local Node tests with compact output. |
| `pnpm typecheck` | Type-check the Node/core project. |
| `pnpm typecheck:browser` | Type-check the DOM/Vite browser project. |
| `pnpm lint` | Run oxlint. |
| `pnpm fmt:check` | Check formatting with oxfmt. |
| `pnpm format` | Format supported files. |
| `pnpm build:browser` | Build browser production assets with Vite. |
| `pnpm dev:browser --host 127.0.0.1` | Start the browser development server. |
| `pnpm test:e2e` | Run Playwright acceptance tests in Firefox. |

## Project Test Seams

Follow the global TDD rules using the narrowest project seam that proves the behavior:

- Language behavior spanning phases: test through `parseSource` or `runSource`.
- Parser structure: simplify token-heavy ASTs for readability, but pin significant tokens and locations when they are the contract.
- Analyzer behavior: assert the complete collected diagnostic list.
- Interpreter behavior: use explicit GIC source and exact commands, output, or diagnostics.
- CLI behavior: spawn the real entry point and assert stdout, stderr, and exit status with terminal color disabled.
- Browser adapter behavior: use browser-local Node tests for pure conversion functions.
- User-visible browser behavior: drive the real editor, worker, and Canvas with Playwright; do not add test-only DOM state.
- Canvas pixels: use exact values in fully covered areas and visible-difference checks on antialiased edges.
- Tutor integration: use a deterministic provider for behavior tests and separate real-login smoke checks for supported providers.

Focused test examples:

```bash
node --test src/tests/interpreter.functions.test.ts
node --test browser/src/color-conversion.test.ts
pnpm exec playwright test e2e/static-preview.spec.ts
```

For core or CLI changes, run:

```bash
pnpm test
pnpm test:compact
pnpm typecheck
pnpm lint
pnpm fmt:check
```

For browser changes, also run:

```bash
pnpm typecheck:browser
pnpm build:browser
pnpm test:e2e
```

## Issue Target

Publish project work as git-bug objects in this repository. The configured bridge synchronizes those objects; do not create a separate set of issues directly on GitHub.

### Delta.app git-bug access

Delta.app clones do not copy the primary checkout's git-bug refs and repository-local configuration. Git-bug resolves repository state from both `GIT_DIR` and its current working directory; setting only `GIT_DIR` while remaining in a Delta worktree produces an empty issue list and prevents identity discovery.

Resolve the primary checkout through Delta's `local` remote, run from that checkout, and scope `GIT_DIR` to each git-bug command:

```bash
PRIMARY_GIT_DIR="$(git remote get-url local)"
PRIMARY_WORKTREE="${PRIMARY_GIT_DIR%/.git}"
(
	cd "$PRIMARY_WORKTREE"
	GIT_DIR="$PRIMARY_GIT_DIR" git-bug bug
)
```

Use the same subshell and scoped `GIT_DIR` when invoking the mutation helper required by the `git-bug` skill. Do not export `GIT_DIR` or use it for source-control commands.
