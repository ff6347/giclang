<!-- ABOUTME: Records documentation index and complete-text exports across editor and website. -->
<!-- ABOUTME: Captures same-deployment approval, offline workflows, source fidelity, and verification limits. -->

# Documentation index and complete export — slices 5–6

## Decisions and implementation

- [decision] Fabian authorized slice 5, then added slice 6 to the same topic branch. He approved inclusion of the canonical Skill's `https://giclang.cc/llms.txt` URL in the same changes, validating locally before the eventual deployment makes it live. The request is branch implementation and push, not a main merge. His deployment mechanism is merge-to-main; no Coolify settings or GitHub Pages deployment was changed.
- [decision] `llms.txt` has a GiC heading, concise context, an ordered Documentation link list including Skill, and an Optional full-text link. It is a discovery index, not the complete text or a promise that a provider will browse it. Published destinations are relative to the index, preserving each origin/base; offline bundled downloads use canonical URLs.
- [decision] `llms-full.txt` includes every indexed page once in shared order/title order. Each page retains its title, canonical public source URL, and exact complete portable body, separated by Markdown boundaries. Skill includes its guide/instructions/reference; exclude YAML frontmatter, the desktop supplement, private state, and the separate examples catalogue. Repeated reference content within distinct authored pages is retained rather than silently deduplicated.
- [technique] Browser-neutral `createDocumentationIndex` and `createDocumentationFullText` live in the shared content model. Full-text assembly reuses per-page serialization. Host-owned routes and resolvers keep publication independent of the editor's bundled downloads.
- [decision] Editor and site Docs expose index discovery, Copy all docs, Download all docs, and an input-limit warning offering individual page copy or the download. Shared feedback stays fixed-size, two seconds, reduced-motion aware, and visible error-only on failure. Editor index/full-text downloads use data URLs with no action-time requests; copying does not alter sketch/recovery. Skill's two distribution links and Fabian's margin styling are preserved.

## Red-green evidence and review

- [technique] Shared fixture tests failed for absent index/full-text APIs before implementation, then passed for ordering, complete unmodified bodies, host destinations, whitespace/CRLF/Unicode, long content, and delimiter-containing Markdown. Real editor acceptance failed for the missing Documentation exports region before UI implementation.
- [technique] Real site production tests failed for missing `llms.txt` before implementation. Editor dev/preview tests failed with HTML instead of UTF-8 plaintext before text exports were emitted and explicitly served. Final root and nested production tests compare full bodies independently and crawl every index destination.
- [lesson] Independent review found entity/HTML interpretation could alter index labels and destinations. A parser-level regression failed because `&copy;` changed the destination into a copyright character. Labels and destinations now preserve literal entities; the regression and review pass.
- [lesson] Direct HTTP `.txt` requests passed while a controlling service worker returned HTML on navigation. The real Chromium regression failed first, then the Workbox denylist was extended for both exports and query strings. Controlled navigation passes in every supported engine without precaching another copy of full documentation.
- [technique] Independent review found no remaining slice blockers after serializer and Workbox corrections. No provider behavior or live deployment was inferred from local results.

## Verification

- [technique] Passed `pnpm test`, `pnpm test:compact`, all package/browser/site typechecks, lint with zero warnings/errors, five shared export fixture tests, four editor real build/dev/preview tests, and twenty site/server tests serially. Root and `/workshop/` output includes exact complete page and combined text plus working index destinations.
- [technique] Final Chromium host acceptance passed all thirty-nine tests with traces enabled. New controls use real clipboard success/permission denial/retry, exact downloads, unchanged dimensions, normal/reduced-motion feedback, and no copy-triggered requests or website execution. Existing per-page/example/Skill tests remain intact.
- [technique] Isolated 10 PRINT Firefox acceptance passed, followed by the entire Firefox suite with one worker: 114 passed and eight existing desktop-Agent skips. All twenty-seven production PWA tests passed across Chrome/Firefox/WebKit, then passed again without a concurrently watched development server. They cover offline restart, complete bundled index/full-text downloads, exact Chromium clipboard output, real clipboard outcomes on other engines, sketch/recovery preservation, plain/query controlled export navigation, and the update lifecycle.
- [technique] Passed normal browser production builds, frozen offline dependency installation, tracked-regular-file Prettier, and diff whitespace checks. Both Caddy configurations validate; actual local Caddy serving passes exact index/full-text bytes, UTF-8 types, all index targets, and query URLs on both outputs. The website raw skill includes the optional index link; existing ZIP/raw acceptance compares canonical source bytes. Temporary containers were stopped.

## Limits and follow-ups

- [risk] The unchanged repeated-example-copy test failed twice with an absolute deadline of 2000 versus document-clock readings 2854/2908. Source inspection suggests pending `animation.startTime === null` was coerced to zero before readiness. A traced focused rerun and complete traced host suite passed without changing that test or shared example control. Issue `370acf4` records this timing hypothesis; do not weaken the deadline assertions.
- [risk] Concurrent Firefox acceptance initially failed gallery readiness for 10 PRINT, including its retry. The isolated and complete serial reruns passed. Evidence is appended to existing issue `be27ae0`; no unrelated preview/gallery fix is mixed into these slices.
- [risk] Root `pnpm fmt:check` still scans ignored Astro files and nested Delta worktrees and fails on twenty-six unrelated paths, tracked by `3c2e51f`. All tracked regular files pass. Existing chunk-size and `gray-matter` eval warnings remain; operator state was not reformatted.
- [risk] Native git-bug push and bridge export ran through the mutation helper. Bridge pull still reports `issue edit: no matching operation found`; full bridge synchronization is not claimed. The complete slice issue breakdown was not published, and `0e7c1ca` remains unchanged.
- [risk] Live `/llms.txt` was 404 at initial discovery. No main merge, public deployment, live URL verification, packaged desktop/Windows UI, or real provider paste/upload was performed. Keep the plan active until operator landing, live index/full-text/page/Skill verification, and account acceptance are complete; remove it rather than archive once all criteria pass.

## Website layout follow-up

- [decision] Fabian authorized merging `origin/main` into `docs/gic-agent-plan` before the layout fixes. The merge includes beta.5 Downloads content from `53c4506` without conflicts; it does not land this topic branch on main or deploy it.
- [decision] Only the Docs sidebar receives left spacing using `--s4`; its mobile width accounts for that margin. The Docs main text styles stay unchanged. Downloads uses a semantic `main` to inherit the existing centered `66ch` content styling, retaining every release link and warning.
- [technique] Three rendered Chromium layout regressions failed first for zero sidebar inset and the absent Downloads main, then passed after implementation. Both Docs routes and Downloads fit a 375 px viewport; Downloads stays centered at desktop widths.
- [verification] All 29 site Chromium acceptance tests and 20 site/server Node tests passed. Site typecheck, lint, scoped Prettier, and diff whitespace checks passed. Fabian's existing IPv6 port-4321 server was left running; production acceptance used port 4322.
