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
