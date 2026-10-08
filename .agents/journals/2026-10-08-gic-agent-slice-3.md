<!-- ABOUTME: Records example code and description copying across editor and website. -->
<!-- ABOUTME: Captures approved error-only feedback, exact-source boundaries, and verification. -->

# Example copying — slice 3

## Scope and decisions

- [decision] Fabian authorized slice 3 and a static website `/examples/` page resembling the editor's examples. It shows package-owned thumbnails, descriptions, and permanently selectable code without execution. No filters, independently authored catalogue, or demo-loading action was added.
- [decision] Fabian explicitly superseded the example clipboard fallback requirement: failure shows only an error, with no details, textarea, or additional content. Existing description and source remain available for manual selection. This decision applies to examples, not the planned documentation slices.
- [decision] `ExampleDescription.markdown` preserves the authored description body. `createExamples` shares pairing, enablement, and ordering between hosts; `createExampleCopyText` combines the complete body with exact source in a collision-safe `gic` fence. Host rendering and clipboard APIs remain outside the package.
- [decision] Copying does not load an example, modify the sketch/recovery snapshot, prepend the skill, or make provider/network requests. Editor copying remains bundled and offline. Skill delivery remains exactly two ordinary links; native prompt/installation boundaries, `.zed/`, issues, and slices 4–6 remain untouched.

## Red-green evidence and review

- [technique] Fixture tests failed for missing shared helpers before implementation. They cover Unicode, LF/CRLF, empty and whitespace-only bodies, authored blank lines, source without a final line ending, long inputs, fence collisions, and standalone example assembly.
- [technique] Website production tests failed for the absent page before implementation, then passed against root and `/workshop/` builds with exact visible code, authored copy text, rendered descriptions, thumbnail bytes, canonical ordering/enablement, and navigation. A worker's unrelated warning-suppression config edit was removed; the known eval warning remains outside this slice.
- [technique] Real Chromium acceptance failed for missing editor source before implementation. Final tests verify actual clipboard contents, keyboard activation, genuine permission denial scoped to the browser context, retry, error-only UI, narrow layouts, and unchanged source/recovery. No browser API replacement or test-only application state was used.
- [lesson] A frontmatter regex narrower than the metadata parser leaked metadata for accepted BOM/language tags and closing suffixes. Regressions failed first; direct inspection of `gray-matter` led to using its first closing `\n---` boundary and slicing the original source while removing only the immediate delimiter line ending. Closing suffixes remain body text as the parser defines; missing closing delimiters yield an empty body.
- [lesson] Source and feedback below an example description can be clipped by a viewport-height card. A short-window regression failed for the final source glyph; expanded cards now scroll vertically. The test reaches the last code line and error message through actual scrolling/keyboard use.
- [technique] Narrowing a viewport wraps Monaco's visual lines and resize settles asynchronously. Preservation assertions restore the original viewport and await the visible lines, while checking the exact recovery snapshot independently.
- [risk] A browser-suite run overlapping package rebuilds had a drawing failure and wrapping retry. The final sequential run passed; do not rebuild watched packages during browser acceptance.
- [technique] Independent review found no remaining actionable findings after the frontmatter and card-reachability fixes.

## Verification

- [technique] Passed `pnpm test` (433 tests), final `pnpm test:compact`, package/browser/site typechecks, and `pnpm lint` with zero warnings/errors through the declared mise toolchain.
- [technique] Passed all seven website build tests, including root and non-root examples and unchanged Skill exports.
- [technique] Passed the complete Firefox suite (101 passed, eight existing desktop-Agent skips), all fifteen production PWA tests across Chrome/Firefox/WebKit, and all four Chromium example/Skill host acceptance tests. Production offline example tests verify no action-time requests; Chrome additionally compares real clipboard contents with complete canonical inputs.
- [technique] Passed a normal browser production build, scoped formatting with the existing repository config, and whitespace validation. Existing operator servers were not stopped or reused; isolated clipboard acceptance used ports 5197 and 4323. Full Firefox acceptance bound free IPv4 port 5173 while the operator's IPv6 loopback server remained untouched.
- [risk] Root formatting still reports the configuration mismatch tracked by `3c2e51f` (271 paths at the check); unrelated files were not reformatted. Existing browser chunk-size and website `gray-matter` eval warnings remain. Zed still reports existing untouched Vite hot-update/native workspace diagnostics despite passing CLI typechecks. No packaged native UI interaction, public deployment, paid provider completion, or provider paste/upload is claimed.

## Website compact-card follow-up

- [decision] Fabian requested editor-sized, equal-height website cards and individual pages reached through thumbnails and titles. The overview uses fixed `18rem × 18rem` cards; build-generated `/examples/<id>/` pages contain full linked descriptions, selectable source, and the preserved copy action. No server runtime, execution, filters, or independent catalogue was added.
- [technique] Moved the existing site bundle discovery to `apps/site/src/lib/examples.ts`, consumed by the overview and dynamic Astro route. Shared content/model exports and editor behavior remain untouched. Links and backlinks honor the deployment base, and only enabled examples receive detail pages.
- [technique] Root/non-root production tests failed first for overview source blocks; Chromium failed first for oversized cards. Updated acceptance retains complete descriptions, exact code/copy text, asset comparisons, and no-execution checks on all generated detail pages rather than dropping the contracts.
- [lesson] Clipped rich description previews retained hidden attribution links in the tab order. A long-title/narrow-card regression failed with four links rather than two. The overview now uses the existing noninteractive `renderUserMarkdown` renderer; detail pages retain complete trusted Markdown links. Actual Tab traversal verifies thumbnail → title → next thumbnail.
- [technique] Passed compact tests, all seven site build tests including `/workshop/` detail links and enabled-only routes, site typecheck, lint with zero warnings/errors, all five Chromium host checks, scoped formatting, and whitespace review. Browser acceptance covers every card's uniform dimensions, both thumbnail/title navigation, full code, narrow layout, clipboard success/genuine denial/retry, and unchanged Skill/editor behavior. Independent review found no remaining actionable findings.
- [decision] This is a slice 3 website presentation follow-up. Slices 4–6, issues, desktop managed files, and provider behavior remain unchanged; public deployment is not claimed.
