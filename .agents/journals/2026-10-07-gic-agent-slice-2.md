<!-- ABOUTME: Records portable GiC skill copying and ZIP delivery across editor and website Docs. -->
<!-- ABOUTME: Captures approved export boundaries, red-green tests, verification, and provider limits. -->

# Portable GiC skill — slice 2

## Scope and decisions

- [decision] Fabian authorized only slice 2 and approved an exactly pinned `fflate` dependency, build-time shared export assembly, separate host export wiring, and a selectable textarea fallback. Slices 3–6 and publication of the issue breakdown remain pending.
- [technique] The session began with the commit skill repository scan. The clean branch was `docs/gic-agent-plan`. Retrying the reflection push succeeded; the live GitHub branch matched preserved commit `e6a3655780eada0d16a81124e634764dd7aa8a9c` before implementation.
- [decision] `readGicAgentExport()` derives complete chat text and ZIP bytes from the exact canonical skill/reference pair. Copy text strips skill frontmatter only; ZIP and inspection retain the original sources. The two archive entries are `gic-agent/SKILL.md` and `gic-agent/references/language.md`.
- [decision] ZIP generation uses `fflate` only at build time. The editor bundles prepared source strings, copy text, and base64 ZIP bytes through the Skill guide's Vite export query. Browser downloading uses a local Blob URL without fetching a website asset. Website prerendered export routes own their public URLs and honor the deployment base.
- [decision] Both hosts announce copying success only after clipboard completion. Genuine rejection reveals, focuses, and selects the same complete payload; an always-available details control also permits manual copying. No copy action sends data to a provider or changes the sketch.
- [decision] The editor-owned Agent supplement stays outside every portable output. Bundled Agent loading, learner-modified installed copies, managed-file behavior, issue `0e7c1ca`, and `.zed/` remain untouched. No migration, local installation cleanup, new agent tools, or later-slice exports were added.
- [technique] GPT-6 Luna workers handled shared assembly, website wiring, browser acceptance, quality gates, and independent review with bounded write scopes. Primary coordination reviewed contracts, implemented editor wiring and offline acceptance, and retained Git ownership.

## Red-green evidence and lessons

- [technique] Shared tests failed first for the absent export module and then caught the raw-source/body contract mismatch. Fixture tests now cover exact complete copy assembly, Unicode, CRLF, blank bodies, no frontmatter, retained code fences, and long authored text. System `unzip` independently extracts and compares source bytes.
- [lesson] `gray-matter` removes leading body line breaks; preserve the authored body directly after the frontmatter closing delimiter rather than trimming or reserializing Markdown.
- [technique] Editor tests failed for missing copy/archive data and missing controls, then passed after Vite and UI integration. The real Vite watcher verifies both display and export refresh when either canonical source changes.
- [technique] Website build tests failed for missing actions/archive and control placement before implementation. Production tests verify the exact static raw pair and archive under root and `/workshop/` deployment bases.
- [technique] Chromium acceptance uses genuine `Browser.setPermission` clipboard denial, not API replacements. Both hosts verify exact real clipboard text, success/error/retry feedback, focused full selection, keyboard controls, actual downloaded archives, source inspection, and narrow layouts. Editor acceptance preserves visible source and the recovery snapshot.
- [lesson] pnpm rewrites lockfile formatting when adding a dependency. Applying the repository's existing Prettier configuration restores the existing layout; the dependency change is eleven lockfile lines, with no unrelated resolution changes.

## Verification

- [technique] Passed `pnpm test` (433 tests), `pnpm test:compact`, package/browser/site typechecks, and `pnpm lint` with the declared mise toolchain. Frozen-lockfile installation passed.
- [technique] Passed the complete Firefox suite: 100 passed, eight existing desktop-Agent skips. Fresh test servers owned this checkout on port 5173; no other worktree server was reused or stopped.
- [technique] Passed both Chromium Skill delivery flows and all four website build tests, including a temporary non-root production build.
- [technique] Passed all twelve production PWA tests across Chrome, Firefox, and WebKit. Offline Skill acceptance compares full selectable text and downloaded source bytes in all three engines, verifies the actual clipboard in Chrome, and observes no network requests during the actions.
- [technique] Passed native tests (161 passed, one existing live-provider test ignored), Cargo formatting, Clippy with warnings denied, browser production build, and macOS application/DMG packaging.
- [technique] All changed supported files pass scoped Oxfmt with `.prettierrc.mjs`; the Astro page passes Prettier, and `git diff --check` passes. Independent review found no actionable defects.
- [risk] Root `pnpm fmt:check` still uses defaults instead of `.prettierrc.mjs` and reports 266 formatting paths. Existing issue `3c2e51f` owns that configuration problem; unrelated files were not reformatted.
- [risk] Zed reports an unresolved newly created export module and existing Vite/native type diagnostics despite successful package typechecks, real module execution, Cargo tests, and Clippy. Those editor diagnostics were not silenced through unrelated code changes.
- [risk] Existing Vite chunk-size and site `gray-matter` eval warnings remain. No paid provider completion, actual Claude/ChatGPT archive upload, or packaged native UI interaction was performed.

## Setup evidence

- [technique] Claude's current official Skills documentation confirms ZIP-folder uploads through Customize → Skills → + → Create skill → Upload a skill, code execution/file creation prerequisites, and activation through the skill toggle. The guide links the official documentation and distinguishes it from actual archive acceptance.
- [risk] ChatGPT's current help page was blocked by an HTTP 403 challenge during discovery. Standalone ZIP acceptance remains unverified; copy/paste is explicitly the fallback. External chats receive only context the learner chooses to paste and cannot automatically inspect the editor or local files.

## Two-link delivery follow-up

- [decision] Fabian superseded the clipboard delivery requirements with exactly two ordinary matching links on desktop, PWA, and website: **Download skill (ZIP)** and **View raw skill**. Skill clipboard actions and their tests/helpers, buttons, details, textareas, feedback, and fallbacks are excluded.
- [decision] Fabian confirmed `https://giclang.cc` and requested both complete original sources together in the raw plaintext document. The website publishes `skills/gic-agent.txt` with source labels, preserving skill frontmatter, authored whitespace, Unicode, and the full language reference.
- [technique] Shared export assembly produces `rawText` without Markdown parsing or frontmatter removal. The ZIP retains exactly `gic-agent/SKILL.md` and `gic-agent/references/language.md`, derived from the canonical package sources and independently compared after system `unzip` extraction.
- [decision] Vite bundles only prepared archive bytes through `?skill-export`; the editor uses an ordinary data-URL download link without handlers or network requests. Its raw link opens the public website. Astro emits base-aware local ZIP/plaintext links and routes. Both hosts use the same labels and wrapping link layout.
- [technique] Revised raw-assembly and host behavior tests failed before implementation and passed afterward. Three focused shared-export tests and all 23 content tests passed. The Vite watcher verifies display/archive refresh after either canonical source changes and deterministic archive restoration.
- [technique] The follow-up passed core/CLI tests (433), compact tests, package/browser/site typechecks, lint, four website build tests, and both dedicated Chromium link/export tests. The complete Firefox suite passed 100 tests with eight existing desktop-Agent skips; all twelve production PWA tests passed across Chrome, Firefox, and WebKit, including offline ZIP extraction and no action-time network requests.
- [technique] Native tests passed 161 tests with one existing live-provider test ignored. Cargo formatting, Clippy with warnings denied, browser production build, and macOS application/DMG packaging passed. Scoped Oxfmt, Astro Prettier, whitespace checks, and independent GPT-6 Luna review found no actionable problems.
- [risk] Root formatting still reports the 266 pre-existing paths covered by issue `3c2e51f`. Existing Monaco chunk-size and website `gray-matter` eval warnings remain. No actual provider ZIP upload or packaged native UI interaction was performed, and the plaintext route is not claimed to be publicly deployed.
- [decision] Setup guidance distinguishes manual raw-text use from filesystem extraction and documented Claude upload/activation. Website raw-text access requires network on all platforms; editor ZIP downloading remains bundled/offline. The editor-only supplement, installed learner edits, bundled Agent loading, `.zed/`, and issue `0e7c1ca` remain untouched. No migration, cleanup, issue breakdown publication, or slices 3–6 were implemented.
- [technique] After resumption, the commit skill scan confirmed only the expected follow-up changes on `docs/gic-agent-plan`. Local HEAD and the live remote both matched `1cfac2529cb84a55ffc181d2d916f03073342206`; reflection commit `e6a3655` remains an ancestor, confirming the earlier push blockage was resolved without rewriting it.
- [technique] Final resumed checks passed all three shared-export tests, both content-watcher tests, all four website build tests, scoped formatting, Astro Prettier, and whitespace validation. Implementation and test changes were committed as `7a9bbf0` without bypassing hooks.

## Raw skill frontmatter

- [decision] Fabian requested that the combined plaintext start directly with the original skill frontmatter. The first source label is omitted; only the appended reference retains its label. Both complete authored sources and the ZIP source pair remain intact.
- [lesson] Text before the opening frontmatter delimiter prevents ordinary frontmatter parsers from discovering skill metadata. The fixture regression returned empty metadata before the fix and correctly parsed `name` and `description` afterward.
- [technique] Passed all three shared-export tests, all four website build tests including the non-root base, core/CLI tests (433), compact tests, package/browser/site typechecks, lint, browser production build, dedicated Chromium link/export acceptance, and the complete Firefox suite (100 passed, eight existing desktop-Agent skips). GPT-6 Luna ran bounded quality gates; scoped formatting and whitespace checks passed.
- [decision] The two-link UI, ZIP generation, desktop prompt boundary, installed learner copies, `.zed/`, and issues are unchanged. No server owned by Fabian was stopped or reused for acceptance. Root formatting retains its previously recorded limitation; the browser build retains the existing chunk-size warning.
