<!-- ABOUTME: Records the Slice 12 landing and test-contract maintenance. -->
<!-- ABOUTME: Captures durable PWA, content, and toolchain lessons. -->

# Slice 12 Landing

- [decision] `feat/slice-12-desktop` landed on `main` after the Tauri desktop integration, native document commands, themes, and packaging checks passed.
- [decision] Mutable examples under `content/` are application data, not E2E fixtures. Acceptance tests must not pin their count, titles, or Canvas colors; they assert catalog availability and enabled-example exclusion instead.
- [technique] The offline PWA workflow waits for the exact current preview to enable PNG export and allows 60 seconds for Windows Firefox.
- [lesson] Mise's npm pnpm backend produced an unusable launch stub during `mise exec`; the native `pnpm = "12.5.1"` tool resolves the locked executable correctly.
