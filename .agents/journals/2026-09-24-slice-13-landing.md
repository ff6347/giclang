<!-- ABOUTME: Records the Slice 13 landing and final sketchbook validation. -->
<!-- ABOUTME: Captures the macOS-first direction and deferred sketch-library work. -->

# Slice 13 Landing and Sketchbook

## Outcome

- [evidence] Slice 13 landed on `origin/main` at `4011fa9`; the reviewed feature branch remains available.
- [evidence] Core and compact tests, core/browser typechecks, lint, formatting, 31 Rust tests, Clippy, the packaged macOS build, and all 76 Firefox E2E tests passed on the final candidate.
- [decision] Complete the macOS workflow before platform-specific Windows/Linux validation; the tutor-less PWA remains the interim fallback.
- [decision] Issue `234820f` is closed after the macOS workspace and sketchbook implementation landed. Release-platform evidence remains in `f264662`.
- [decision] Saved-sketch browsing, descriptions, thumbnails, and the PWA storage/import model are separate work in issue `0ac47e5`.

## Durable lessons

- [lesson] Sketch-name allocation must include normalized existing sketch folder names and `.gic` basenames, not only names generated during the current session; otherwise restarting GiC can reuse a name and collide with an existing sketch.
- [lesson] A desktop-only Monaco `Cmd+K` binding must be registered only when its desktop callback exists. Registering a no-op binding in the PWA shadows Monaco's `Ctrl+K` hover chord.
- [technique] Under parallel Firefox load, fully covered Canvas color assertions may need a longer polling deadline; a 10-second poll remained deterministic in repeated and full-suite runs.
