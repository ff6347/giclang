<!-- ABOUTME: Explains Deno-first desktop packaging for the shared GIC v0.9 IDE. -->
<!-- ABOUTME: Defines runtime spikes, narrow bridge behavior, package smoke tests, and fallbacks. -->

# Milestone: Package the IDE with a Deno-First Desktop Shell

## Learning Goal

Package the shared static GIC IDE as one dedicated-window application without
requiring students to manage a terminal, server, or companion process.

## Prerequisites

- [Desktop shell and filesystem](../decisions/desktop-shell-filesystem.md)
  defines the Deno-first path, narrow bridge, file model, credentials, and
  fallback order.
- [Browser IDE technology](../decisions/browser-ide-technology-sandbox.md)
  defines the shared Monaco and worker boundaries.
- The dedicated-shell spike proves the selected runtime and version on macOS
  and Windows.
- Monaco static preview, language assistance, layout, files, recovery, examples,
  and exports are complete through the shared UI.
- CLI `check` and `run` behavior is available for core parity.

Animation is not a prerequisite for the static v0.9 package.

## Concepts to Understand

- Packaging hosts the shared IDE; it does not create a desktop fork.
- Privileged filesystem and credential operations cross one narrow typed bridge.
- The webview must not receive raw credentials or broad shell access.
- A built package must work without development assets or a separately started
  process.
- Runtime evidence, not preference, controls movement through the fallback
  order.

## Included

- Deno-first packaging for macOS and Windows, with Linux best-effort.
- Packaged asset loading and application metadata.
- Native Open, Save, and Save As dialogs for one `.gic` document.
- Recent files, dirty state, discard warnings, format-on-save, examples, and
  private recovery.
- Narrow settings, recovery, workspace, credential, external-launch, and
  lifecycle operations.
- Shared diagnostics, static preview, output, language assistance, layout, PNG,
  and standalone HTML behavior.
- Packaged smoke tests that use real files and no development server.
- A recorded switch to the next fallback if Deno evidence fails.

Tutor provider implementation and signed release installers remain later slices,
but the bridge must reserve only their accepted privileged operations.

## Interface Boundary

No grammar or AST changes belong in this milestone.

The webview requests specific user actions and receives operation-specific plain
data. The host owns dialogs, authorized file paths, settings/recovery storage,
workspace files, credential persistence, callback handling, and application
lifecycle. No generic shell command or unrestricted read/write method is
exposed.

## TDD-oriented Student Checklist

- Complete the disposable shell spike before production bridge work.
- Start with bridge contract tests against temporary real directories.
- Package built UI assets and launch without a development server.
- Add native `.gic` open/save round trips and cancellation cases.
- Add recovery and settings restart coverage.
- Prove webview code cannot request arbitrary credentials or shell execution.
- Run the same static source through CLI and packaged UI for result parity.
- Run clean macOS and Windows package smoke checks.

## Non-Goals

- Rebuilding or forking the IDE for desktop.
- Animation as a static release prerequisite.
- A built-in updater.
- Final provider login implementation.
- Broad filesystem or shell access.
- Mobile packaging.
- CLI export or server rendering.

## Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm fmt:check`
- `pnpm lint`
- The package launches without a development server.
- Real `.gic` open/save, recovery, examples, layout, and exports match shared UI
  behavior.
- Static diagnostics, output, preview, and language assistance survive
  packaging.
- macOS and Windows smoke checks pass; Linux results are recorded.
- Bridge and credential boundaries match the accepted desktop decision.

## Notes / Decision Gates

Deno remains the implementation target only while Spikes A and B in the
[v0.9 roadmap](../plans/vertical-slice-roadmap.md) support it. If evidence fails,
record the reason and move through the accepted narrow-port, Electron, then
Tauri-plus-sidecar order without rewriting the shared UI.

This milestone corresponds primarily to v0.9 roadmap Slice 12. Signing and final
installers belong to Slice 17.
