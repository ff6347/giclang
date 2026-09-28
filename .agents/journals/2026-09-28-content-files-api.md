<!-- ABOUTME: Records the build-time content API contract and its verification. -->
<!-- ABOUTME: Preserves the boundary between package-owned files and host-owned public URLs. -->

# Build-time content files

- [decision] `@giclang/content/node` lists all files recursively in `about`, `docs`, and `examples`, including disabled examples. Every entry has a content-relative path and a `file:` URL; Markdown also exposes its complete frontmatter, body, and source.
- [decision] The host decides where assets are published and resolves relative Markdown images when compiling HTML. The content package does not create public web URLs or import filesystem APIs into the browser-facing entry points.
- [lesson] `compileMarkdown` recognizes example descriptions by a path ending in `examples/<id>/description.md`, whether the caller uses a repository path or the package-relative path returned by the file API.
- [verification] Focused content tests, core/CLI and compact test suites, core/content/editor type checks, lint, formatting, browser build, and a built-package import smoke check passed. The browser build retains its existing large-chunk warning.
