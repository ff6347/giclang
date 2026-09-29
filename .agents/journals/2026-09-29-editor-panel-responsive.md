<!-- ABOUTME: Records the responsive reading-column work for shared editor panels. -->
<!-- ABOUTME: Captures panel-local breakpoints, table overflow behavior, and verification. -->

# Responsive editor panel content

- [decision] Docs, About, and Settings render their direct content in a centered grid track capped at `66ch`; Examples and other workspace panels retain their existing layouts.
- [decision] The responsive breakpoint is a named container query on each bounded panel, so resizing a desktop FlexLayout pane behaves independently of the browser window width.
- [decision] Markdown tables compile into keyboard-focusable scroll regions. Below `44rem` of panel width, tables retain a `40rem` minimum width and scroll locally instead of widening the workspace panel.
- [lesson] Markdown code blocks also need local horizontal overflow; otherwise long GIC comments propagate width to the panel even when every table is contained.
- [lesson] The work branch must start from current `origin/main`: movable per-document documentation panels landed after the local `main`, requiring the responsive layout to target each titled Docs panel rather than the former combined document.
- [follow-up] Git-bug `3b37668` tracks hiding “Allow copying agent responses” in browser/PWA Settings, where no Agent is available.
- [verification] Passed compact Node tests, core/CLI/content/editor typechecks, lint, formatting, browser build, 96 Firefox browser tests (88 passed and 8 expected tutor skips), 9 production PWA tests across Chrome/Firefox/WebKit, 137 Rust desktop tests (136 passed and 1 expected live-API ignore), cargo format and clippy, and the packaged macOS desktop build.
