<!-- ABOUTME: Records the production Tauri shell foundation for GIC Slice 12. -->
<!-- ABOUTME: Preserves the settings boundary, package evidence, and remaining smoke checks. -->

# Slice 12 Desktop Shell

## Outcome

- [decision] The production desktop application lives under `src-tauri/`, packages the shared Vite assets, and uses bundle identifier `cc.incode.gestalten`.
- [decision] Desktop settings cross two operation-specific commands. The webview can read and write only Canvas frame, format-on-save, and workspace-layout values; paths remain native.
- [decision] Desktop shutdown waits for queued settings writes before destroying the window. Failed writes retry during close and keep the window open with a visible explanation if persistence remains unavailable.
- [decision] Native settings writes use an atomic same-directory replacement. Unreadable, non-text, and invalid settings recover to safe defaults.
- [decision] PWA update registration remains enabled in browsers and is disabled in the packaged runtime.

## Evidence

- [evidence] Five Rust tests cover real-file round trips, rejected and filtered keys, invalid-data recovery, non-text recovery, and replacement of an invalid file.
- [evidence] Three browser-local tests prove close-time flushing waits for rapid queued writes, retries transient failures, and rejects persistent failures.
- [evidence] The arm64 macOS application package builds from shared assets, launches without a development server, and closes through the settings-flush lifecycle.
- [evidence] The unsigned macOS `.app` is 10 MB. The package uses Tauri 2.11.6, Tauri CLI 2.11.5, Rust 1.91.1, and macOS 26.6.2 on Apple silicon.
- [evidence] Core tests, compact tests, both TypeScript checks, lint, formatting, browser build, 76 browser end-to-end tests, six PWA tests, Rust formatting, and Clippy pass.

## Remaining Checks

- [risk] Packaged macOS still needs a human walkthrough of Monaco, worker execution, Canvas, diagnostics, output, layout persistence, PNG export, and standalone HTML export.
- [risk] Windows packaging and the equivalent packaged workflow smoke test remain unrun.
- [risk] Linux packaging is best-effort and remains unrecorded.
- [risk] Git-bug issue `f264662` remains open until packaged-runtime behavior and required platform evidence pass.

## Native Documents and Presentation

- [decision] Native GiC, File, and Edit menus replace the in-window File menu in the desktop host. Open, Save, and Save As use native dialogs; Settings uses `Cmd+,`; Edit exposes Undo, Redo, and Format Document.
- [decision] Native dialogs run from asynchronous Tauri commands. Blocking dialogs on the main event thread terminated the macOS application.
- [decision] The native document store retains one active path behind a random UUID. Opening or saving another document revokes the previous capability.
- [decision] Cancelling Open or Save As is a no-op. Recovery is cleared and formatted source is committed only after a successful replacement or save.
- [decision] The macOS package is named GiC and uses a transparent native title bar with its redundant title hidden.
- [decision] FlexLayout owns webview drag/drop. Tabs use grab/grabbing cursors, a self-contained drag badge, and square, visible drop previews.
- [decision] Appearance mode and palette are stored separately. System selects the configured light or dark palette as macOS changes; VS Light and VS Dark are the defaults.
- [decision] GiC ships VS Light, macOS Classic, Catppuccin Latte, VS Dark, Nord, Catppuccin Frappé, Catppuccin Macchiato, and Catppuccin Mocha application and Monaco palettes.
- [evidence] Human macOS checks passed native Open, Save As, panel dragging, native menu structure, and drag affordances after the packaged fixes.
- [risk] The complete exact-candidate landing gates were not run after the final theme expansion.
