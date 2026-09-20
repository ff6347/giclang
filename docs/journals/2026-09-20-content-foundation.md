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
- [decision] Legacy example migration adapts recognizable visual and teaching ideas to current GIC without adding language capabilities. Unsupported behavior is omitted rather than simulated as equivalent.
- [decision] Visible example descriptions retain the original author's name and link to the source directory at a pinned revision.
- [content] The first form cohort adds An Obvious Circle by Jeanette Knipp, Close the Triangle by Jakob von Kietzell, Criss Cross by Paulina Mrksic, and Geometrical Shape and Pyramid by Julia Hilt.
- [technique] Example thumbnails are captured from the actual successful 100×100 GIC Canvas render after opening each bundle through the Examples panel.
- [verification] All five sources passed `gic check` and headless command execution. Core and compact tests, both TypeScript projects, lint, formatting, the browser production build, all 76 Playwright tests, and a headless browser walkthrough passed.
- [content] The follow-up form cohort adds Proximity and Similarity, both created by Fabian Morón Zirfas.
- [decision] `form/2d/categories` is not a low-hanging adaptation because its rounded rectangles are central to the composition and GIC does not provide them; the unindexed source also records no original author metadata.
- [verification] Proximity and Similarity passed `gic check`, headless command execution, visible Canvas rendering, core and compact tests, both TypeScript projects, lint, formatting, browser production build, and all 76 Playwright tests.
- [content] The grid cohort adds Corridor by Julia Hilt; Fishing Net, Grid Closure, Grid Contrast, Grid Symmetry, and Hidden Room by Edmundo Mejía Galindo; Lines by Julia Hilt; and Vision by Fabian Morón Zirfas.
- [content] The repeat and chance cohorts add Hidden Circles by Natalie Schreiber; Splatter and Random Circles by Fabian Morón Zirfas; Circle Bubbles and Hairy Story by Edmundo Mejía Galindo; and Dots and Mice Nip by Julia Hilt.
- [decision] The p5.js and Processing Random Circles sources share one adaptation because they express the same teaching idea; its description retains both pinned source links and the original author.
- [verification] All 15 added bundles passed `gic check`, headless command execution, and visible Canvas rendering. Core and compact tests, both TypeScript projects, lint, formatting, browser production build, and all 76 Playwright tests passed; one named CSS background test required its configured retry and is tracked by git-bug issue `588f7ac`.
- [content] The next static cohort adds Cross, Concentric Arcs, Radial Arcs, Black and White Stripes, Decrease Size, Circle Raster, Diagonal Grid, Groups, and HSB by Fabian Morón Zirfas, plus Colorblock by Julia Hilt.
- [decision] Fixed HSB studies use equivalent CSS color literals, and Colorblock precomputes its fixed midpoint color; neither adaptation adds color-mode or interpolation behavior to GIC.
- [verification] All ten bundles passed the source CLI check and headless command execution, then rendered visibly through the Examples panel with enabled PNG export. A reproducible cold-worker timeout observed before the successful walkthrough was added to git-bug issue `588f7ac`.
- [verification] Core and compact tests, both TypeScript projects, lint, formatting, browser production build, and all 76 Playwright tests passed for the static cohort.
- [content] The final approved adaptation cohort adds Colored Dots and Colored Shapes by Daniele Maselli; Triangle and Quad, Kanizsa's Triangle, and Rotate Rect by Fabian Morón Zirfas; Popup Circles by Daniele Maselli; Colorful Circles by Malte Völkner; and Praegnanz by Varying Edges and Similarity by Hue and Size by josues.
- [decision] Chance-dependent sketches use bounded seeded randomness instead of continuous drawing or Gaussian sampling. Similarity by Hue and Size makes the source title's hue grouping explicit with a fixed CSS palette while retaining the legacy grid and scale variation.
- [verification] All nine bundles passed the source CLI check and headless execution, then rendered visibly through the Examples panel with enabled PNG export and captured 100×100 thumbnails.
- [verification] Core and compact tests, both TypeScript projects, lint, formatting, browser production build, and all 76 Playwright tests passed for the final approved cohort.
- [inventory] The exhaustive pinned-source audit classified 107 remaining executable sketch directories: 92 excluded from v0.9, 5 duplicates, and 10 compatible lower-priority candidates. The complete per-directory table is recorded on git-bug issue `4986a39`.
- [decision] The ten deferred compatible adaptations move to follow-up issue `2b97835`; this lets the completed migration inventory close without conflating workshop-ready examples with lower-priority deliberate rewrites.
