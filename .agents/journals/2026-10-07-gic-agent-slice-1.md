<!-- ABOUTME: Records implementation and verification of the shared GIC skill slice. -->
<!-- ABOUTME: Captures source boundaries, naming decisions, and remaining validation limits. -->

# Shared GIC skill — slice 1

## Outcome

- [decision] Fabian authorized only slice 1 of [Shared GIC agent content](../plans/gic-agent-content.md). Clipboard actions, ZIP downloads, Markdown exports, `llms.txt`, and `llms-full.txt` remain outside this implementation. The six-issue breakdown was not published; issue `0e7c1ca` was left unchanged.
- [decision] Fabian confirmed that no managed-path migration or local cleanup is required because the application has no users yet. The managed set uses `gic-agent`; files and manifest records outside that set remain untouched.
- [decision] The canonical skill and compact language reference live in `packages/content/content/skills/gic-agent/`. Desktop policy, reference tools, and installed support bytes embed those sources directly, while editor and website Docs use the shared documentation compiler.
- [decision] The integrated Agent retains bundled-skill loading. External assistants can use learner-modified installed copies. The shared skill gates its existing tool and context instructions under GIC editor agent only; no capabilities were added.
- [technique] Native workspace status exposes the configured directory and resolved destinations for allowlisted support files. Settings labels the artifact Skill, preserves modified-file actions, and distinguishes missing/uninstalled destinations without masking retained files' states.
- [lesson] The Markdown compiler belongs at build time: its dependencies require Node globals. Vite explicitly tracks both canonical sources and invalidates the Skill guide on changes.
- [technique] Four provider-smoke script call sites consume the package-owned reference after relocation. The reference describes `print` with zero or more arguments.

## Verification

- [technique] Red-green tests covered shared documentation assembly, Skill presentation, native path reports, editor Docs navigation, and source-update invalidation. Assembly and discovery use fixtures or exact source comparisons rather than production-prose assertions; workspace safety uses real temporary files.
- [technique] Passed `pnpm test` (433 tests), `pnpm test:compact`, `pnpm typecheck`, `pnpm typecheck:browser`, and `pnpm lint` using the declared mise toolchain.
- [technique] Passed clean browser and site builds, site typecheck, and both site build tests after removing only generated content/editor/site output directories.
- [technique] Passed the complete Firefox suite with two workers: 100 passed and eight existing desktop-Agent skips. The single-worker attempt reached its four-minute command limit; its orphaned test-owned server was stopped before rerunning. Other worktrees' servers were left alone.
- [technique] Passed desktop tests (161 passed, one existing live-provider smoke ignored), Cargo formatting, Clippy with warnings denied, and macOS app/DMG packaging.
- [risk] `pnpm fmt:check` fails on pre-existing files because Oxfmt does not discover `.prettierrc.mjs`. Existing issue `3c2e51f` tracks that configuration problem. All slice files pass scoped Oxfmt checks using the existing config; unrelated formatting was not changed.
- [risk] The packaged app launched, but macOS denied accessibility automation, so interactive native Settings and Agent verification is not claimed. No real provider completion or paid request was made. Existing Monaco chunk-size and site gray-matter eval warnings remain unrelated tracked concerns.
