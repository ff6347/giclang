<!-- ABOUTME: Records code typography behavior across the website and shared editor. -->
<!-- ABOUTME: Captures browser regression coverage and quality-gate results. -->

# Code typography

- [lesson] Firefox renders documentation code with generic monospace at 13px unless the editor overrides browser defaults; the body uses IBM Plex Mono at 16px. Both `pre` and `code` need inherited font family and size so fenced blocks do not retain the smaller preformatted size.
- [decision] Website and editor inline code use italics. `code:not(pre code)` excludes every code element within a preformatted block without changing block typography.
- [verification] The Firefox regression failed on the font family and 13px size before inheritance, and on normal inline styling before italics. It passes with matching body typography, italic inline code, and upright fenced code.
- [verification] Core/CLI tests passed (433); compact tests, both typechecks, lint, website build tests, website build, and browser/PWA build passed. The standard Firefox suite passed 100 tests with 8 existing tutor skips. Edited editor files pass the repository Prettier configuration.
- [risk] `pnpm fmt:check` reports 256 files because oxfmt lacks configuration; existing git-bug `3c2e51f` tracks this independently.
- [technique] An isolated browser port avoids other worktrees, but the external-asset acceptance test hardcodes port 5173. The final suite ran with the standard configuration once that port became free.
