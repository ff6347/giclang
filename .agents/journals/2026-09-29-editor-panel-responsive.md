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
- [decision] Documentation tables use settings-style cell padding and top row rules, plus `--s3` spacing before the following element. Body rows alternate with the theme chrome color except in `colors-named`, where sample rows remain unstriped.
- [verification] The table-style follow-up passed 97 Firefox browser tests (89 passed and 8 expected tutor skips), all 9 production PWA tests, compact Node tests, browser typecheck, lint, formatting, browser build, and a packaged macOS desktop build. The existing Menubar/FlexLayout render warning remains tracked by git-bug `32ada2f`.
- [decision] The first alternating body row is tinted. Shared token `--color-chrome-light` mixes theme chrome and background equally, preserving a subtle stripe in light and dark editor themes.
- [verification] The tint follow-up passed compact tests, browser typecheck, lint, formatting, site/browser/desktop builds, all 97 browser checks (89 passed and 8 expected tutor skips), and all 9 PWA checks. Git-bug `2301c6d` tracks the pre-existing `gray-matter` direct-eval warning emitted by the site build.
