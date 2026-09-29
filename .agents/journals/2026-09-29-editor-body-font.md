<!-- ABOUTME: Records the editor font regression and browser verification. -->
<!-- ABOUTME: Distinguishes packaged font assets from styles applied to page content. -->

# Editor body font

- [lesson] `@giclang/styles/tokens.css` supplies IBM Plex faces and `--font-body`, but the editor must apply that variable to `body`; a package refactor removed the body declaration and left application tabs using the browser's serif default.
- [technique] Browser acceptance checks computed body, tab, and Monaco fonts and loads the actual face through `document.fonts`; Firefox reports `FontFace.family` with quotation marks.
- [verification] The existing Firefox font test failed on `serif` before the fix, then passed after restoring the body declaration. `pnpm typecheck:browser`, `pnpm build:browser`, and the editor Docker build passed. The full Firefox suite passed 91/92; stale About copy in `e2e/content.spec.ts` was recorded on git-bug `be27ae0`. Repository-wide site lint/format failures remain tracked by `fff2a5f`.
