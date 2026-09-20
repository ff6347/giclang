<!-- ABOUTME: Records the bundled product-content architecture and verification. -->
<!-- ABOUTME: Preserves Markdown trust, example bundle, and thumbnail decisions. -->

# Product content foundation

- [decision] Vite remains the application framework. About, documentation, and examples are build-time content rendered inside the persistent React workspace rather than routed pages.
- [decision] Host-neutral authored content lives under `content/` so the PWA, desktop package, managed workspace, and tutor references can consume one source.
- [decision] Repository Markdown is trusted product source and preserves authored HTML. The compiler requires `title` and numeric `order` frontmatter; external or provider content must use a separate untrusted rendering path.
- [decision] Every example directory contains `<identifier>.gic`, `description.md`, and a static 100×100 `thumbnail.png`. The directory name is the stable identifier, and Vite fails the build for an incomplete bundle.
- [technique] ABOUTME comments precede Markdown frontmatter and are removed before parsing. Product Markdown is excluded from oxfmt because its Markdown formatter otherwise treats frontmatter following comments as prose and corrupts the metadata.
- [technique] Static thumbnails come from the existing current-render PNG export, avoiding catalog-time GIC execution and a second preview lifecycle.
- [verification] Focused content-model tests, compact core/browser tests, both TypeScript projects, lint, formatting, browser production build, focused Firefox content acceptance, and a headless Chrome walkthrough passed.
