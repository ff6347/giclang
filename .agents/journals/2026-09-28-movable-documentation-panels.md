<!-- ABOUTME: Records the movable documentation-panel implementation and its browser evidence. -->
<!-- ABOUTME: Captures layout migration, cross-sublayout dragging, and remaining test risk. -->

# Movable documentation panels

- [decision] Each bundled Markdown page is one path-identified FlexLayout tab inside the Docs sublayout. Two native moves suffice to place one beside the editor: dock Gestalten beside Docs, then drag the page into Gestalten; the initial top-level tab arrangement remains unchanged.
- [lesson] Persisted layout validation must permit Docs and Gestalten in separate top-level tabsets. Requiring Gestalten's original tabset silently reset the layout after a successful drag and reload.
- [technique] Version-8 layout loading migrates versions 6 and 7, then reconciles added or removed documents by stable path-derived IDs without moving existing pages. A retained empty Docs tabset remains a drop target after every page moves away.
- [technique] The bundled Colors → Named Colors Markdown link selects the existing target wherever it was docked. Relative path resolution stays within the bundled docs and leaves external links with their browser behavior.
- [verification] Focused model and link tests, compact/core tests, typechecks, scoped lint and formatting, the browser build, browser drag/link acceptance, and offline PWA drag/link acceptance in Chrome, Firefox, and WebKit passed.
- [risk] Full Firefox acceptance exposed intermittent Monaco completion-details visibility and example-card hover geometry; the Monaco reproduction was added to git-bug `be27ae0`. The unrelated Astro site still fails repository-wide lint, formatting, and prerendering under git-bug `fff2a5f`.
- [verification] Fabian ran `pnpm build:desktop` on the feature branch; Tauri produced the macOS `GiC.app` and arm64 `.dmg`. A successful package build does not itself prove the two-step drag inside the installed desktop webview.
- [lesson] The browser/PWA Agent split and the movable Docs branch independently stored version 8 layouts. Version 9 recognizes both shapes: migrate the single Docs article from the Agent-aware layout or retain an existing Docs sublayout, while reconciling Agent by host.
