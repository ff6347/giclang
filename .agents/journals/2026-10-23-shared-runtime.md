<!-- ABOUTME: Records the shared browser-runtime package and integration checks. -->
<!-- ABOUTME: Preserves validation blockers and follow-up issue ownership. -->

# Shared browser runtime

- [decision] Fabian authorized committing the blog baseline and continuing on
  `feat/blog`. Baseline commit `9d88f9b`, Fabian's About-page deletion
  `7fe9fcb`, and runtime commit `f5a5308` are pushed to origin.
- [decision] `@giclang/runtime` owns Canvas rendering, disposable Blob-worker
  execution, and lightweight preview orchestration. Its build compiles the
  current `@giclang/core` worker once and embeds it in both ES-module and
  self-contained IIFE outputs; generated assets remain untracked.
- [decision] `mountPreview(root)` reads source from the root's textarea, scopes
  all DOM access to that preview, and returns disposal. `registerSketchElement()`
  connects this lifecycle to `<gic-sketch>`. Reconnection remounts; disconnection
  clears pending debounce/execution timers and terminates execution.
- [decision] The site demo and blog's existing `GicCode` MDX component import the
  package. Editor Canvas rendering and standalone HTML export use the same
  implementation. Root build commands use pnpm dependency ordering; development
  startup builds runtime dependencies once rather than continuously watching them.
- [technique] Runtime TDD began with a missing generated artifact, then exercised
  real workers and Canvas in Firefox. Coverage includes independent instances,
  current-core result parity, edits, parse/analyzer/runtime diagnostics, retained
  print output, stale-run cancellation, timeout recovery, unexpected worker
  failure, and disconnect/reconnect cleanup.
- [lesson] A recursive test program may overflow before its execution timeout,
  particularly in Chromium and WebKit. Use a very large repeat range for
  deterministic timeout acceptance; test stack overflow separately as an
  unexpected worker failure.
- [technique] An isolated production Astro/MDX fixture imports the real blog
  component beneath `/workshop/`, verifies two independent canvases and editable
  source, and avoids depending on the blog's unrelated page layout.
- [technique] Passing checks: `pnpm test` (433 core/CLI tests),
  `pnpm test:runtime`, `pnpm typecheck`, `pnpm typecheck:browser`,
  `pnpm build:site`, frozen dependency installation, changed-code oxlint,
  changed-source formatting, and whitespace review.
- [technique] Standalone `file://` execution passes Chromium, Firefox, and WebKit,
  including editing, diagnostics, timeout/cancellation recovery, no external
  requests, and literal closing-script text in the initial GIC source.
- [blocked] Full blog production build fails on undefined `BaseHead` in
  `apps/blog/src/pages/blog/index.astro`, independently reproduced before runtime
  integration. Git-bug `10ffbd3` tracks this; no unrelated page changes were made.
- [blocked] An empty untracked `packages/content/content/examples/sessions/`
  directory predates this session and breaks browser build and E2E server startup.
  It was not deleted without permission. Git-bug `5a09675` tracks operator cleanup
  and validation. Compact tests stalled at Vite content-watch setup for 600 seconds;
  a diagnostic attempt also stalled. A causal connection to the directory is
  suspected, not established.
- [blocked] Global lint fails in blog `HeaderLink.astro` and feedback
  `scripts/download.ts`; git-bug `6a40695` tracks those unrelated fixes. Global
  formatting also fails across baseline source, generated Astro state, lockfile,
  workspace configuration, and Delta worktrees; existing `3c2e51f` tracks the
  formatting gate. Changed-source checks pass without broad reformatting.
- [risk] Git-bug native and bridge pushes succeed, but bridge pull still reports
  `issue edit: no matching operation found`. This is the already-tracked bridge
  problem, not a successful inbound synchronization.
- [blocked] Runtime issue `0182fff` remains open until broader verification
  blockers are resolved. Manual headed-browser smoke and container builds were
  not performed. Automated browser acceptance used real browser engines.

## Explicit preview bindings

- [decision] Fabian approved `PreviewOptions` with explicit Canvas, input,
  diagnostics, output, and initial code. Commit `d21b24e` is pushed on `feat/blog`.
  Mounting assigns the initial input value. Controls may be textarea or text input;
  elements need no shared parent or runtime-specific attributes.
- [decision] The runtime does not register custom elements. The blog component
  and site page own their light-DOM lifecycle adapters and call disposal on
  disconnection. Standalone export passes explicit bindings directly.
- [technique] A real-worker test failed with the previous selector API before
  implementation. It now passes with two previews spread across separate DOM
  containers, deliberately different initial input values, both control types,
  independent edits, diagnostics, timeout recovery, active-worker disposal,
  removed input listeners, pending-debounce disposal, and remounting.
- [technique] Production MDX acceptance verifies that removing and reconnecting
  an active sketch cannot let the disposed run clear its replacement result.
- [lesson] Astro scoped styles attach attributes to ancestor markup. The site
  build assertion must recognize a `main` element with attributes rather than
  require the literal opening tag `<main>`.
- [technique] Passing checks: 433 core/CLI tests, runtime and production MDX
  tests, all five site-build tests, package/core/editor typechecks, site build,
  standalone file export in Chromium/Firefox/WebKit, and changed-code lint/format.
- [blocked] Full blog and editor builds, browser E2E startup, and global
  lint/format still reproduce the previously recorded unrelated blockers.
  Compact tests again stalled at Vite watcher setup and were stopped by the
  60-second tool timeout. The existing issues remain open; no local state was
  deleted and no unrelated fixes were included.
