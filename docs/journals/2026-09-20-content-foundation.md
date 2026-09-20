<!-- ABOUTME: Records the bundled product-content architecture and verification. -->
<!-- ABOUTME: Preserves Markdown trust, example bundle, and thumbnail decisions. -->

# Product content foundation

- [decision] Vite remains the application framework. About, documentation, and examples are build-time content rendered inside the persistent React workspace rather than routed pages.
- [decision] Host-neutral authored content lives under `content/` so the PWA, desktop package, managed workspace, and tutor references can consume one source.
- [decision] Repository Markdown is trusted product source and preserves authored HTML. The compiler requires `title` and numeric `order` frontmatter; external or provider content must use a separate untrusted rendering path.
- [decision] Every example directory contains `<identifier>.gic`, `description.md`, and a static 100×100 `thumbnail.png`. The directory name is the stable identifier, and Vite fails the build for an incomplete bundle.
- [technique] Static thumbnails come from the existing current-render PNG export, avoiding catalog-time GIC execution and a second preview lifecycle.
- [decision] Documentation files render consecutively by `order`, with no generated navigation or topic-selection state. Each frontmatter `title` is inserted exactly once as an `<h2>`; the authored Markdown controls the remaining structure.
- [decision] Example cards use a compact wrapping layout and the explicit action “Load this example.” Example frontmatter requires non-empty `categories` and `tags` arrays so later filtering can use stable metadata without changing the content format.
- [decision] Product Markdown starts directly with frontmatter and contains no agent-facing `ABOUTME` comments. Vite watches the complete `content/` tree and reloads the content catalog when files are created or deleted.
- [decision] Browser source is grouped by responsibility: React views in `components/`, React orchestration in `hooks/`, reusable browser services and models in `lib/`, and browser-local unit tests in `tests/`. Entry points, workers, styles, and declarations remain at `browser/src` root.
- [verification] Core and compact tests, both TypeScript projects, lint, formatting, browser production build, all 76 Firefox acceptance tests, and a headless Chrome walkthrough passed. Creating and deleting a Markdown document while Vite was running updated the visible ordered documentation without restarting the server.
