<!-- ABOUTME: Records the repository-state migration and Lox project separation. -->
<!-- ABOUTME: Captures path boundaries and verification for later work. -->

# Project state layout

- [decision] GIC agent workflow records live in `.agents/`; human-facing specifications, learning notes, design images, and `docs/zen-model-routes.md` remain in `docs/`. Authored application content stays in `content/`.
- [decision] The Lox teaching project is maintained in `ff6347/lox-lang`. GIC does not build or package its Java sources.
- [technique] Before deleting `docs/lox-lang/`, compared the 28 tracked GIC files with `origin/main` in the Lox repository by Git blob ID and mode; the remote held the same content. Removed only ignored `.class` outputs and Finder metadata from the source directory.
- [technique] Kept the GIC root commands intact. Core tests, compact tests, typechecks, lint, formatting, and the browser build passed after removing the Lox project. The Vite chunk-size warning is already documented in memory.
- [lesson] Relocated Markdown links to the active language specification must cross from `.agents/decisions/` or `.agents/milestones/` to `../../docs/Language specification.md`. Historical journal prose remains unchanged.

The GIC changes are on `chore/move-agent-state` in commits `cff5486` and `c777c10`; the Lox import is commit `da396cc` on `ff6347/lox-lang` `main`.

- [decision] Fabian classified the Zen provider route evidence as agent documentation. Its authoritative path is `.agents/zen-model-routes.md`.
- [decision] The language specification describes syntax, semantics, examples, and diagnostics. Host architecture, delivery, and tests are governed by root `AGENTS.md`, accepted decisions, and `.agents/plans/vertical-slice-roadmap.md`; deferred editor and export options stay in decisions and git-bug, not in active language rules.
