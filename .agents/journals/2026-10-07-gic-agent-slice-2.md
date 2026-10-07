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
