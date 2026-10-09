<!-- ABOUTME: Records individual documentation copying and Markdown publication across both web hosts. -->
<!-- ABOUTME: Captures exact-source boundaries, hosting regressions, verification, and remaining limits. -->

# Documentation copying — slice 4

## Contract and implementation

- [decision] Fabian authorized complete Copy page content for pasting into external agents, canonical `https://giclang.cc` destinations on every host, and the examples' two-second fixed-size in-button Check with error-only failure. Reduced motion uses a static check. No provider upload or request is part of copying.
- [decision] Every page includes its title and complete authored Markdown without YAML frontmatter. Skill includes the displayed guide, canonical instructions, and complete language reference, excluding the desktop Agent supplement. The two existing ZIP/raw distribution links remain separate and unchanged.
- [technique] Content compilation retains exact body whitespace. `createDocumentationCopyText` is browser-neutral; build-time `portableMarkdown` rewrites parser-positioned Markdown/reference/HTML destinations without reserializing source or changing code examples. Host-owned resolvers produce canonical public destinations.
- [technique] Editor and site builds publish `docs/<id>.md` and stable documentation image assets under each deployment base. Editor Copy page consumes bundled content offline; it never fetches the exported route. Shared host-specific copy controls also preserve example feedback behavior.
- [decision] No `llms.txt`, catalogue index, combined documentation export, provider upload, public deployment, or issue-breakdown publication belongs to this slice. Slices 5–6 require separate authorization.

## Regressions and review

- [technique] Shared fixtures ran red before implementation and cover exact body/title assembly, Skill completeness, Unicode, CRLF, links/images/reference definitions/HTML destinations, escaping, tables, and code preservation. Initial real editor acceptance failed because Copy page was absent.
- [lesson] Vite preview and Astro preview default static Markdown to `text/markdown` without charset. Editor preview explicitly serves UTF-8 from emitted files. Site acceptance uses a small Node static-file server matching Caddy headers, with real-file HTTP tests for MIME, directory routes, confinement, GET/HEAD, and missing pages.
- [lesson] Narrow website documentation tables need their existing wrappers to scroll horizontally. Real browser acceptance reproduced 12 px viewport overflow before enabling wrapper scrolling and verifies keyboard access to the wide table.
- [lesson] Workbox's HTML navigation fallback intercepts Markdown even online. A real activated-and-controlling service-worker regression failed in all three engines with HTML instead of Markdown. The navigation denylist excludes Markdown, including URLs with query strings; all engines pass afterward.
- [lesson] URI decoding outside async middleware guards can leave malformed encoded requests unresolved. Real dev/preview regressions failed first; both hosts now return 400 for invalid encodings while preserving normal responses.
- [lesson] Preview routing must come from emitted files, not current authored sources. An emitted-only fixture failed its UTF-8 assertion under root and nested bases before discovery switched to the output directory; exact emitted bytes and MIME then passed.
- [technique] Independent source review found no remaining slice blockers after the middleware, service-worker, and emitted-file corrections. Review did not claim to independently rerun the parent's browser gates.

## Verification

- [technique] Passed `pnpm test`, `pnpm test:compact`, package/browser/site typechecks, and `pnpm lint` with zero warnings/errors through the declared mise toolchain.
- [technique] Passed all four real editor build/dev/preview publication tests under `/` and `/workshop/`, including independently assembled exact payloads, stable binary assets, UTF-8 response types, malformed URLs, and emitted-only publication.
- [technique] Passed all twenty site/server tests serially, including both production deployment bases, complete page-copy/export equality, original HTML and ZIP/raw exports, static server security/MIME, and documentation styling.
- [technique] Passed the complete Chromium host suite, full Firefox suite, and all twenty-four production PWA tests across Chrome, Firefox, and WebKit. These exercise real clipboard success/rejection/retry, fixed-size transient and reduced-motion checks, exact complete payloads, sketch/recovery preservation, offline copying with no requests, unchanged Skill links, controlled Markdown navigation, and update lifecycle.
- [technique] Passed the normal browser production build and frozen offline dependency installation. Both Caddy configurations validate using an existing local Caddy image. Actual local Caddy serving of both production outputs passes exact Markdown-byte, UTF-8-header, and missing-page 404 checks; temporary containers were stopped.
- [risk] Root `pnpm fmt:check` still fails on ignored Astro metadata and another Delta worktree, tracked by `3c2e51f`. Do not reformat or delete operator state. Existing large-browser-chunk and website `gray-matter` eval warnings remain outside this slice.
- [risk] Source inspection confirmed the site development collection's missing package-content watchers predates slice 4. Display/copy/export share that collection; development edits may require restart, while production builds stay fresh. Issue `d0b475e` records the follow-up. Native git-bug push and bridge export succeeded; bridge pull reported `issue edit: no matching operation found`, so full bridge synchronization is not claimed.
- [risk] No packaged desktop UI, Windows runtime, provider login/paste/upload, or public deployment was performed. The desktop receives the shared editor UI; native code and managed installation behavior are unchanged.
