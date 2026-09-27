<!-- ABOUTME: Plans the incremental pnpm workspace migration for GIC applications and packages. -->
<!-- ABOUTME: Defines publishing, workflow, and deployment gates that protect the existing product. -->

# Pnpm workspace migration

Status: Proposed for review; no workspace files have been moved.

## Goal and boundaries

Organize GIC in one repository with separately buildable language, CLI, content, editor, and desktop boundaries. Preserve the existing root commands, shared editor behavior, offline PWA, packaged desktop app, and deployment paths throughout the move. `@giclang/cli` must remain publishable with a `gic` executable; moving to the scope does not itself promise a compatibility package named `gic-lang`.

This is a structural migration, not a language or product-feature release. Work on a feature branch after the current documentation cleanup lands; make each stage reviewable, testable, and pushable. Do not create an empty landing-page app, a second editor implementation, or a documentation site as part of the migration.

The current package is `gic-lang`. The existing `pnpm-workspace.yaml` holds dependency policies but does not declare workspace packages. The root Vite config, TypeScript projects, Docker build, Playwright servers, standalone exporter, and Tauri config use repository-relative paths. Treat each as a migration dependency, not incidental cleanup.

## Target dependency direction

```text
packages/core          @giclang/core       browser-neutral language API
packages/cli           @giclang/cli        Node CLI -> core; publishes bin "gic"
packages/content       @giclang/content    authored About, guides, examples, assets
apps/editor            @giclang/editor     shared React/Monaco/Canvas UI + PWA -> core, content
apps/desktop           @giclang/desktop    Tauri shell -> editor build output
apps/site              @giclang/site       future giclang.cc site -> content only
```

Only core and CLI need npm publication for the proposed CLI dependency graph; keep the content and application packages private unless a later requirement changes that. The desktop consumes the **same editor build**, not a fork of its React UI; its Rust bridge remains the platform adapter. `apps/site/` is a future location, not a package to create now. A future docs site could consume `@giclang/content` without moving agent state or the language specification into product content.

Keep the repository-root `package.json` as a private orchestrator **after** the CLI package owns publishing. Preserve the root commands and observable behavior documented in [project instructions](../../AGENTS.md#commands), plus the existing `test:pwa` command. The root remains the working directory for established CI and operator commands; forwarding scripts may delegate to package scripts. Keep one lockfile and one `pnpm-workspace.yaml`, preserving its existing dependency policies.

## Decisions to verify before moving files

1. Confirm control of the `@giclang` npm scope and the intended first public version. Keep `bin.gic` stable even though the package name changes. Determine whether `gic-lang` was previously published before proposing any alias, deprecation, or compatibility release; none is assumed.
2. Prove how `@giclang/core` is built and resolved by Node, the CLI, the Vite worker, the standalone HTML build, and TypeScript in **both** development and production. Avoid a dev-only source alias that hides a broken published export. Define stable package exports and declaration output only after this proof.
3. Confirm publishing `@giclang/core` alongside `@giclang/cli` so registry installations can resolve the CLI dependency. Bundling core into a CLI-only release is a separate alternative requiring approval. Prove that pnpm packs the chosen graph without unresolved `workspace:` references. Choose a coordinated version and publishing order (core, then CLI); do not introduce release automation or publish to npm before review.
4. Treat `content/` as product-authored input. Keep `docs/` for human-facing project references and `.agents/` for agent workflow state. Renaming product content to `docs` or creating `docs.giclang.cc` needs its own decision.

## Migration stages

### 0. Pin the current behavior

On a migration branch, record a clean baseline using the quality gates in root `AGENTS.md`. Confirm the real CLI package-install test, editor preview, standalone export, offline PWA lifecycle, and Tauri development/build commands before changing layout. Identify the current GitHub Pages preview base path, Coolify Docker output, and desktop asset paths. Record any failing gate instead of treating it as a migration regression or silently disabling it.

**Exit:** baseline results, current published-package status, and package-resolution decision are recorded; no application behavior has changed.

### 1. Extract the publishable language and CLI boundary

Move the browser-neutral language implementation into `packages/core/` and the Node entry point plus CLI-only presentation into `packages/cli/`. Keep `gic check`/`gic run` output, exit statuses, and package-install behavior unchanged. Move their tests with their owning behavior; keep the root test entry points discovering the same suites. Update real imports to package entry points and preserve separate Node/core and browser TypeScript checks. Register only the actual packages in `pnpm-workspace.yaml`; use the package manager to maintain workspace dependencies and lockfile.

Build core before every consumer of its compiled exports, not only CLI. From a clean checkout and install with no generated core output, run the root CLI and browser/standalone build and development commands; do not let a stale `dist/` or a development-only source alias mask a missing build dependency. Pack both packages, inspect their exports, declarations, dependency metadata, executable path, and included files, and install their tarballs in a temporary directory outside the workspace. Spawn `gic` from that installation and verify check/run success and error cases. The installed-package acceptance test in `src/tests/cli.test.ts` must move with the CLI and cover the two-package install. Keep the existing root `build:cli` and `pnpm test` contracts passing before making the root private.

**Exit:** Node CLI and browser-neutral API work from package exports; root browser/standalone builds and development startup resolve core from a clean install without prebuilt output; tarball installation runs `gic` without repository-relative files; all root core/CLI gates pass.

### 2. Give product content one build-time boundary

Move authored About, docs, and example bundles into `packages/content/`. Put the host-neutral content model, validation, and trusted Markdown compilation behind content-package exports so a future site can consume them without depending on the editor; keep Vite-specific glob imports and asset URL handling in the editor. Keep image URLs, immutable examples, and Vite create/delete hot reload working. `import.meta.glob` requires analyzable literal paths: verify asset discovery through the workspace package in both dev and production rather than replacing it with an assumed runtime HTTP API. Do not move agent journals, the language specification, or engineering decisions into this package.

**Exit:** editor content views, actual example loading, build-time validation, and watch behavior pass; a consumer independent of the editor can use the content model and compiler; no runtime network request is needed to fetch bundled content.

### 3. Move the shared editor and PWA

Move `browser/`, its Vite config, standalone HTML exporter, PWA test fixtures, and browser typecheck into `apps/editor/` without changing the editor's runtime behavior. Keep a single Monaco/Canvas UI and disposable GIC workers. Update cross-package imports and generated asset paths; verify development HMR when core or content changes and verify the same exports in the production and standalone worker builds.

Retarget Playwright's dev server and fixed test URLs, the two-revision PWA test builder/server, Docker's manifest-copy/install layers and static output, Caddy, and Pages artifact/base-path configuration. Keep `pnpm dev:browser`, `pnpm build:browser`, `pnpm test:e2e`, and `pnpm test:pwa` runnable from the root. Preserve the current live origin and service-worker scope during this structural migration. Moving the editor to `editor.giclang.cc` needs a separate deployment decision covering host configuration, origin-scoped browser storage (including unsaved recovery snapshots), user export or migration guidance, and offline scope verification.

**Exit:** Firefox editor/Canvas acceptance, direct-`file://` standalone export, three-engine offline/update lifecycle, production Docker image, and Pages preview all work with the root commands.

### 4. Move the desktop shell

Move `src-tauri/` under `apps/desktop/` and give the shell a workspace command boundary without duplicating the editor. Retarget `beforeDevCommand`, `beforeBuildCommand`, `devUrl`, `frontendDist`, icons, Cargo manifest paths, bundled workspace files, and native test/build invocations. Check the Tauri command working directory explicitly; relative paths that happened to resolve at repository root must resolve from the shell's location after the move.

**Exit:** native tests, Rust quality gates, desktop dev launch, packaged build, and a packaged click-through for Open/Save and preview pass. The PWA still works without the native shell.

### 5. Add the landing page only when scoped

When there is an accepted site issue, create `apps/site/` for `giclang.cc` and consume `@giclang/content` without importing the language core or editor. Keep its deploy independent of the PWA at `editor.giclang.cc`. Decide separately whether `docs.giclang.cc` needs a site; it is not a reason to move `.agents/` into product content.

## Completion gate

At every stage, run the affected project gates from root `AGENTS.md`, inspect build and test output, and push the stage before starting the next one. Declarative package/config changes need direct review, install/pack checks, and builds rather than tests that assert file contents. Executable behavior changes require a failing behavioral test first. Do not merge to `main` without Fabian's explicit approval.

The migration is complete only when root commands still work, `@giclang/cli` can be packed and installed with its core dependency in a clean directory, `gic` retains its behavior, the PWA and desktop use the same core/content/editor boundaries, and current deployments still serve the expected assets and offline scope. Update root `AGENTS.md`, README, CI, Docker, and package metadata as their owning stages change; remove completed migration plans once the work is done.
