<!-- ABOUTME: Defines independently testable vertical slices for the GIC v0.9 workshop release. -->
<!-- ABOUTME: Separates static release gates, risk spikes, optional tutor work, and deferred animation. -->

# GIC v0.9 Vertical Slice Roadmap

## Product Target

GIC v0.9 is a workshop-ready environment for static generative graphics:

- a dedicated-window desktop IDE for macOS and Windows;
- a tutor-less installable offline PWA;
- a browser-neutral language core and language service;
- Monaco editing, Canvas preview, diagnostics, and structured output;
- one-document `.gic` file, recovery, example, PNG, and standalone HTML workflows;
- optional Socratic tutoring through Codex or OpenCode; and
- stable `gic check` and `gic run` CLI entry points.

Animation is a stretch goal. It does not block v0.9.

The full product requirements are tracked by git-bug issue `60b2077`, **PRD: GIC v0.9 workshop environment**.

## Current Baseline

Slices 0 through 4 are complete. The shared TypeScript core parses, analyses, and executes static GIC programs, records drawing commands, captures structured `print` output, and supports reusable functions, returns, recursion, math, and seeded randomness. The browser preview runs programs in disposable workers and renders recorded commands to Canvas with timeout protection.

The existing textarea browser surface is an implementation baseline, not the v0.9 editor.

## Accepted Product Boundaries

- The desktop IDE is the primary distribution; the PWA is secondary.
- Tauri 2 is the selected desktop shell. Static authoring stays in one process, and operation-specific Rust commands own native dialogs, files, credentials, and provider calls. Electron is the fallback.
- The core authoring experience never depends on tutor availability.
- Desktop and PWA reuse one shared UI and browser-neutral core.
- The language service is direct and browser-neutral; LSP and VS Code are later adapters, not v0.9 deliverables.
- The desktop and PWA each edit one document at a time.
- Explicit saving and private recovery snapshots are separate operations.
- Standalone HTML is one offline, editable, direct-`file://` artifact.
- Tutor providers are contacted only after explicit question submission.
- Tutor policy is Socratic and reinforced by having no write, shell, or web tools.
- User-modified managed support files are never overwritten.
- CLI export and server-render commands remain out of scope, but `gic check` and `gic run` are required.

## Shared Test Seams

Every production slice must terminate at one or more of these seams:

1. **Core and CLI:** deterministic unit/integration tests plus spawned CLI processes asserting output, diagnostics, and exit status.
2. **Shared UI:** Playwright drives Monaco and visible application behavior.
3. **Desktop boundary:** narrow bridge contract tests use temporary real files; packaged builds receive macOS and Windows smoke tests.
4. **Standalone export:** generated files open directly through `file://` in Chromium, Firefox, and WebKit.
5. **Tutor boundary:** deterministic provider tests cover context, policy, sessions, and credentials; real providers receive explicit login smoke tests.
6. **PWA lifecycle:** install, offline restart, recovery, and controlled update activation are tested as application behavior.

Tests must use real parser, analyzer, interpreter, storage, worker, and Canvas boundaries where practical. Expected failures must be captured and asserted; raw stack traces and unhandled errors are not acceptable output.

## Completed Foundations

### Slice 0: Core language platform

**Outcome:** Source locations, parser coverage, analyzer foundations, runtime contracts, render-command boundaries, and browser-neutral core APIs.

### Slice 1: First static Canvas sketch

**Outcome:** A student types a static sketch and sees Canvas output through the shared command model.

### Slice 2: Expressions, variables, conditionals, and diagnostics

**Outcome:** Computed sketches rerender correctly and invalid source produces source-located diagnostics without stale Canvas output.

### Slice 3: Repeated patterns and style

**Outcome:** `repeat` and style commands produce deterministic repeated Canvas artwork.

### Slice 4: Reusable sketch functions

**Outcome:** User-defined functions, returns, recursion, math, randomness, and structured `print` output work through the shared preview path.

## Risk Spikes

Spikes establish evidence and decisions. They are timeboxed, disposable, and do not become production code automatically.

### Spike A: Dedicated desktop shell

**Question:** Can a small desktop shell provide a stable dedicated window, built asset loading, native dialogs, application lifecycle hooks, callback handling, and a narrow privileged bridge on macOS and Windows?

**Evidence:** The retained Tauri artifact packages and launches built assets without a development server or companion process, exercises Rust/webview callbacks and lifecycle, tests an opaque-document-ID file adapter, and records exact macOS runtime and webview versions. Native dialog clicks and Windows packaging remain production checks.

**Decision:** Use Tauri 2 with an operation-specific native Rust bridge. Keep Electron as the fallback.

### Spike B: Tutor streaming and authentication in the packaged runtime

**Question:** Can a native Rust provider boundary stream responses, complete ChatGPT/Codex device authorization and refresh, accept OpenCode credentials, and resume after restart without the Node-oriented coding-agent runtime?

**Evidence:** The retained Tauri/Rig artifact streamed OpenCode Zen and ChatGPT subscription responses through the packaged UI. Human testing completed device authorization, reused persisted authentication after a rebuilt launch, and exposed the Tauri capability and model-catalog failures recorded in the accepted desktop decision.

**Decision:** Use a GIC-owned provider-neutral Rust interface backed by Rig. Keep the narrow GIC-owned device-authorization port required by Rig 0.42. Do not add a Node sidecar without evidence of a concrete production need.

### Spike C: Direct-`file://` standalone workers

**Question:** Can one generated HTML file create and replace Blob workers when opened directly from disk in Chromium, Firefox, and WebKit?

**Evidence:** One artifact reruns after edits, cancels an active run, times out an infinite run, and reports diagnostics/output in each engine.

**Decision:** Adopt Blob workers or select another single-file isolation method.

### Spike D: Signing and installer path

**Question:** Which package formats, architectures, signing identities, notarization steps, Windows signing steps, and CI runners can produce workshop-installable artifacts?

**Evidence:** Install, launch, replace with a later build, and uninstall on clean macOS and Windows test environments.

**Decision:** Record the release matrix and the manual or automated signing procedure. A built-in updater remains out of scope.

## v0.9 Production Slices

### Slice 5: Stable CLI check and run

**Student-visible outcome:** A file can be validated with `gic check` and executed with `gic run` through documented, dependable commands.

**Acceptance:**

- `gic check` parses and analyses without executing.
- `gic run` uses the same parse, analysis, and execution pipeline as the IDE.
- Valid, parse-invalid, analysis-invalid, runtime-invalid, missing-file, and invalid-command cases have pinned stdout, stderr, and exit statuses.
- Diagnostics include source locations and never expose raw host stack traces.
- Package metadata exposes a usable `gic` executable.

`gic run` executes headlessly and writes ordered GIC `print` output by default. The `--commands` option instead writes only a stable JSON serialization of the recorded drawing commands. Image rendering is deferred to a later explicit shell-backend decision; Skia is a candidate, not a v0.9 dependency.

**Not included:** Image generation or display, PNG/SVG/GIF export, server rendering, `gic lsp`, animation, or watch mode.

### Slice 6: Monaco static authoring shell

**Student-visible outcome:** Monaco replaces the textarea while preserving the working static preview, diagnostics, worker cancellation, timeout, and output.

**Acceptance:**

- Monaco edits real GIC source and triggers one preview 100 ms after typing stops.
- Current-source success updates Canvas and Output.
- Current-source parse, analysis, runtime, or timeout failure clears Canvas.
- Diagnostics mark their Monaco ranges and appear in Problems.
- Existing static sketch browser acceptance remains green.

**Dependencies:** Existing core/worker/render path.

### Slice 7: Language assistance and formatting

**Student-visible outcome:** The editor offers GIC-aware completion, hover, signature help, Format Document, and configurable format-on-save.

**Acceptance:**

- A browser-neutral service returns deterministic diagnostics, completion, hover, signature, and formatting results for source strings and positions.
- Monaco consumes those results without an LSP process.
- Built-ins and reserved names come from shared definitions.
- Visible user symbols respect analyzer scope.
- Save applies formatting when the setting is enabled; the explicit format action works regardless of that setting.

**Not included:** LSP, VS Code, go-to-definition, documentation comments, or new language semantics.

### Slice 8: Workspace layout and status behavior

**Student-visible outcome:** The IDE has application-level navigation and a persistent resizable Code workspace with recoverable layout state.

**Acceptance:**

- One FlexLayout model provides top-level Code, Settings, Examples, Docs, and About tabs with a model-native Code sublayout.
- Code defaults to Editor and Tutor side tabsets around a middle column.
- Canvas and a lower Problems/Output tabset occupy the middle column.
- Every tab can be dragged, docked, and rearranged across the model.
- The complete arrangement survives restart; Reset Layout restores the sketch defaults.
- Reruns preserve the selected Problems/Output tab while updating badges and content.
- The unavailable Tutor explains setup, Retry, and its optional status without gating Code.

**Dependency:** Slice 6.

### Slice 9: One-document files, examples, and recovery

**Student-visible outcome:** One `.gic` sketch can be opened, saved, renamed, recovered, or started from an example without accidental data loss.

**Acceptance:**

- Open, Save, Save As, recent files, dirty state, and discard warnings work through a platform-neutral document adapter.
- Desktop behavior uses native dialogs and real files.
- PWA behavior uses portable upload/open and download/save operations without persistent file handles.
- Bundled examples open as editable unsaved copies requiring Save As.
- Recovery restores an unsaved copy and never silently writes the `.gic` file.
- Format-on-save runs exactly once before an explicit save.

**Gate:** Resolve recovery expiry, multiple-instance behavior, and moved/deleted recent-file presentation.

### Slice 10: PNG and standalone HTML export

**Student-visible outcome:** A successful sketch exports as native-size PNG or as one editable offline HTML file.

**Acceptance:**

- PNG is enabled only for the exact current successful render.
- PNG dimensions equal Canvas dimensions.
- Any current-source failure disables PNG and clears stale Canvas output.
- Standalone HTML includes preloaded editable source, Canvas, diagnostics, runtime errors, structured output, a 100 ms debounce, worker replacement, and timeout protection.
- The HTML contains no Monaco, storage, Reset button, CDN, or network request.
- Direct-`file://` acceptance passes in Chromium, Firefox, and WebKit.

**Dependency:** Spike C.

### Slice 11: Tutor-less offline PWA

**Student-visible outcome:** The shared editor installs as a PWA, restarts offline, recovers work, and activates updates only after confirmation.

**Acceptance:**

- The PWA installs from a supported browser.
- After one online load it restarts offline with Monaco, core, examples, recovery, preview, diagnostics, output, and exports available.
- Download/open workflows remain functional offline.
- A waiting application update is visible but cannot activate until confirmed.
- The PWA contains no integrated tutor or provider credentials.

**Dependencies:** Slices 6 through 10.

### Slice 12: Desktop shell, bridge, and core file workflows

**Student-visible outcome:** The shared IDE runs in one desktop window with real file and recovery workflows and no companion process.

**Acceptance:**

- Built packages launch without a development server.
- The shell bridge exposes only file, settings, recovery, workspace, credential, and lifecycle operations required by accepted stories.
- Webview code cannot read arbitrary credential content or unrestricted files.
- Open, Save, Save As, recent files, recovery, examples, layout, and exports match shared-UI behavior.
- macOS and Windows packaged smoke tests pass; Linux results are recorded.

**Dependencies:** Spike A and Slices 6 through 10.

### Slice 13: Processing-style workspace and external tutor support

**Student-visible outcome:** First run prepares a familiar sketches workspace and consistent Socratic guidance for external Codex and OpenCode sessions.

**Acceptance:**

- The workspace contains sketches, sessions, short root agent guidance, one canonical GIC tutor skill, and bundled documentation/example references.
- Shipped examples/references remain immutable sources.
- First run installs managed support; Settings offers Repair/Reinstall and Uninstall.
- Unmodified managed files update automatically.
- Modified managed files are flagged and never overwritten.
- External tools launch in the workspace when installed; absence produces clear fallback instructions.

**Gate:** Decide how modified managed files are compared and presented.

### Slice 14: Deterministic Socratic tutor and local sessions

**Student-visible outcome:** The desktop tutor can conduct and resume a constrained local teaching conversation against a deterministic test provider.

**Acceptance:**

- The tutor is a soft dependency with visible offline, unauthenticated, retry, and hidden states.
- No provider call occurs before explicit submission.
- Each submission receives current source, diagnostics, runtime error, and structured output, but no Canvas image.
- The integrated agent loads canonical Socratic policy and references and has no write, shell, browser, or web tools.
- Sessions are transparent JSONL with names, start dates, related sketches, provider/model changes, messages, and append-only compaction checkpoints.
- Context snapshots are not copied into message history.
- Rename updates relationships; continuing with another sketch clones the session.
- Tutor response selection/copying is blocked by default and restored by an accessibility setting.

**Gate:** Fix the session entry schema, partial-write recovery, and durable file relationship identifier.

### Slice 15: OpenCode provider

**Student-visible outcome:** A student can enter an OpenCode API key, choose a supported model, stream tutor responses, restart, and sign out.

**Acceptance:**

- Credentials cross only the privileged provider boundary.
- Protected `auth.json` updates atomically and uses owner-only platform access.
- Credentials never appear in webview storage, logs, exports, prompts, or sessions.
- Curated models are the default; an advanced setting reveals broader models.
- Invalid, revoked, offline, and unavailable-model states are actionable and do not disable the IDE.
- Deterministic coverage and an explicit real-key smoke check both pass.

**Dependencies:** Slices 12 and 14; Spike B establishes the protocol contract.

### Slice 16: Codex OAuth provider

**Student-visible outcome:** A Codex subscriber can sign in, choose a supported model, stream tutor responses, restart with refreshed credentials, and sign out.

**Acceptance:**

- Login callback, refresh, restart, account switch, and sign-out behavior pass against the selected packaged runtime boundary.
- Credential storage and redaction satisfy Slice 15's contract.
- Curated and advanced model behavior matches the shared provider UI.
- Cancelled, expired, revoked, offline, and unavailable-model states are actionable and do not disable the IDE.
- Deterministic coverage and an explicit real-subscription smoke check both pass.

**Dependencies:** Slices 12 and 14 plus Spike B.

### Slice 17: Workshop release packages

**Student-visible outcome:** Students receive installable, replaceable macOS and Windows packages with the complete static authoring experience.

**Acceptance:**

- Clean-machine install, launch, first-run workspace, file round-trip, offline core use, optional tutor setup, replacement install, and uninstall pass.
- Package metadata and application version are correct.
- macOS signing/notarization and Windows signing match the accepted release matrix.
- No built-in updater or companion process is introduced.
- Linux packaging is attempted and documented but does not block release.

**Dependencies:** Spike D and all selected v0.9 production slices.

## Stretch Slice

### Slice 18: Static-safe animation

**Student-visible outcome:** `setup` and `loop` sketches animate with deterministic scheduling and cancellation without weakening static behavior.

**Acceptance:** Semantic `repeat`/`loop` rules, setup/loop interpreter lifecycle, animation built-ins, scheduler hooks, Canvas frame rendering, worker cancellation, runtime UX, and visual regression all pass.

This slice may move before release only when it is independently green and does not delay the static v0.9 package.

## Dependency Order

```text
Completed Slices 0-4
  -> Slice 5 CLI
  -> Slice 6 Monaco static shell
      -> Slice 7 language assistance
      -> Slice 8 layout
      -> Slice 9 files and recovery
          -> Slice 10 exports (after Spike C)
              -> Slice 11 PWA
              -> Slice 12 desktop (after Spike A)
                  -> Slice 13 workspace
                  -> Slice 14 tutor foundation
                      -> Slice 15 OpenCode (after Spike B)
                      -> Slice 16 Codex (after Spike B)
                          -> Slice 17 release packages (after Spike D)

Stretch Slice 18 depends on the existing animation milestones and remains
outside the static release gate.
```

## Open Product and Implementation Questions

These questions are recorded in PRD issue `60b2077` and must be resolved by the owning spike or slice before dependent acceptance tests are written:

1. Which desktop runtime/version survives the dedicated-window and Pi spikes?
2. Which exact OpenCode endpoint and model catalog form the supported contract?
3. Which Codex and OpenCode models comprise the curated defaults?
4. Which single-file worker strategy passes the three-engine `file://` matrix?
5. Which installer formats, architectures, signing identities, and CI runners form the release matrix?
6. How are Windows owner-only credential ACLs created, replaced, and repaired?
7. How are modified managed support files compared and presented?
8. What JSONL session schema and partial-write recovery policy are used?
9. How are renamed, moved, deleted, Save As, and PWA-only documents related to sessions?
10. What is the recovery snapshot creation, expiry, dismissal, and multiple-instance policy?
11. Which browser/OS versions define PWA support?
12. How are absent external Codex/OpenCode applications detected and explained?
13. Which keyboard, screen-reader, focus, zoom, contrast, and reduced-motion checks form release accessibility acceptance?
14. Is an explicit local diagnostic-export workflow needed when automatic telemetry is absent?

## Release Gate

v0.9 is releasable when selected static production slices pass their shared quality gates and packaged macOS and Windows smoke tests. Open animation work, Linux package gaps, later LSP/VS Code work, and CLI export backends cannot block that release.
