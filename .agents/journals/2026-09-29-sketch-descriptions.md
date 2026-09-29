<!-- ABOUTME: Records the approved sketch-description authoring slice and evidence. -->
<!-- ABOUTME: Captures metadata, document-state, native persistence, and remaining acceptance gates. -->

# Sketch descriptions

- [decision] User-authored description frontmatter uses a typed shared schema for nonempty `title`, finite `order`, boolean `enabled`, and string-list `categories` and `tags`. Bundled example compilation retains its stricter category/tag authoring requirements.
- [decision] The browser-neutral content package uses `js-yaml` for safe frontmatter load/dump; the editor shows Markdown as editable text and never renders user descriptions through the trusted bundled-Markdown path.
- [decision] Description and metadata are part of active document dirty comparison and private recovery. Browser source downloads update only the source baseline and retain unsaved description edits; desktop sidecar serialization is sent only through Save and Save As.
- [decision] A blank Markdown body sends no description to native storage, which removes only `description.md`; metadata-only edits do not create a sidecar. Native document opens return the raw sidecar so the shared typed codec controls interpretation.
- [evidence] Initial document-model tests failed because the description transition API was absent; after adding typed description state and comparison, all document-model and codec tests passed.
- [evidence] Real temporary-file Rust tests save/reopen populated descriptions with broken source, copy the sidecar through Save As storage, delete the sidecar after clearing, and verify thumbnail/session/unrelated files remain untouched.
- [evidence] Firefox Playwright tests drive all visible fields, description-only discard and recovery, cross-document default isolation, and source download without description persistence claims.
- [blocked] Packaged macOS bundle creation succeeded, but the actual packaged WebKit/native-dialog save, reopen, cancel/failure, and restart walkthrough remains unexercised. Build success is not packaged acceptance.
- [fix] Bundle replacement stages both source and sidecar before moving either existing file; failures restore previous files, and Save As cleans up a cloned Agent session if document persistence fails.
- [decision] Sidecar ownership requires a same-named source inside one direct child folder of the currently configured sketchbook. Standalone sources remain writable but cannot read, overwrite, or delete neighbor descriptions.
- [fix] Native document selection now produces a pending identity. The shared UI validates description data and confirms discard before native activation; cancellation and invalid descriptions preserve the current document capability and recovery.
- [fix] Recovery accepts structurally valid drafts with an empty title while persistence validation continues to require a non-empty title. Browser users see the storage boundary and actionable title feedback; the order field retains negative/decimal keyboard input.
- [technique] Bundled and user-authored metadata share host-neutral field/type checks while bundled compilation keeps stricter nonempty categories/tags and trusted HTML behavior.
- [evidence] Regressions were observed red for source mutation on sidecar failure, standalone sidecar association, symlink reads, empty-title recovery, and keyboard-entry loss; corresponding Rust, Node, and Firefox tests pass after fixes. Native Save As session-copy rollback also passes a real temporary-file test.
- [evidence] Current branch gates pass: compact tests, core/content/editor typechecks, lint/format, 92 browser E2E tests (8 tutor tests skipped), 146 native tests (1 credential/API test ignored), Clippy, and browser/desktop package builds. The Vite large-chunk warning remains existing build output.
- [blocked] The packaged macOS application builds but the full real UI/native-dialog/restart walkthrough remains unverified; no acceptance claim is made for it.
