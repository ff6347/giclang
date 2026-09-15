# Tauri Application Shell Spike

This directory contains disposable evidence for git-bug issue `a707392`. It is not production application code.

## Questions

- Can Tauri 2 launch built web assets in a dedicated window without a development server?
- Can native Open, Save, and Save As dialogs remain behind operation-specific Rust commands?
- Can the webview edit a selected document without receiving arbitrary filesystem access?
- Can a packaged application prove webview-to-Rust callbacks and close lifecycle behavior?
- Does the static shell require any companion process or Node sidecar?

## Boundary

The frontend can invoke only six custom commands:

- `open_gic` opens a native picker and returns an opaque document ID plus source.
- `save_gic` writes source only to the path already associated with that ID.
- `save_gic_as` opens a native picker, writes source, and returns a new opaque ID.
- `probe_ready`, `probe_event_received`, and `complete_probe` exist only for packaged-spike evidence.

The application does not load Tauri's filesystem or shell plugins. Paths selected by native dialogs remain in Rust's process-local document store and are never returned to the webview.

## Verification

From this directory:

```sh
./verify.sh
```

The script runs Rust tests, checks the bridge boundary, packages a macOS `.app`, launches its bundled binary without a development server, and requires evidence of built-asset execution, a Rust-to-webview event callback, and close lifecycle handling.

Open, Save, and Save As dialogs remain manual UI checks because automated interaction would bypass the native boundary under evaluation.
