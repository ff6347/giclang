<!-- ABOUTME: Plans one movable workspace panel per authored documentation page. -->
<!-- ABOUTME: Defines feasibility gates, persistence behavior, implementation slices, and acceptance checks. -->

# Movable documentation panels

## Goal

Each Markdown file under `packages/content/content/docs/` appears exactly once as a documentation panel. Initially, all documentation panels live inside the Docs workspace, in authored order. A user can drag a panel, such as Named colors, into Gestalten beside the editor or into another permitted workspace location, reorder it, and retain that arrangement after restart. Moving is not copying: the page leaves its previous location. Reset Layout restores the current authored default arrangement.

## Scope and constraints

- Keep the existing bundled Markdown pipeline (`apps/editor/src/lib/content.ts`, `packages/content/src/content-model.ts`, and `packages/content/src/markdown-content.ts`); no network dependency or user-edited documentation.
- Preserve stable identities independent of titles and numeric `order`. Existing document IDs are derived from paths relative to `content/docs/`. A rename or move is therefore an identity change requiring an explicit migration decision.
- `order` defines only the initial arrangement; saved layout order is the user's preference. Do not persist user choices in frontmatter.
- Gestalten's editor, preview, output, and other authoring panels remain usable. About, Examples, and Settings retain their existing roles.
- Do not split documentation into new pages in this work except for a separately approved content-plan dependency. The panel system must work with the current files and later additions.
- No duplicate or silently lost panels; unexpected persisted-layout failures must be handled deliberately.
- In both the browser IDE and the installed offline PWA, relative Markdown links to bundled documentation open/select the target's existing panel. Following a link never copies the document or depends on a network request.

## Existing seams

- `apps/editor/src/components/docs-panel.tsx` currently concatenates all documentation into one article.
- `apps/editor/src/lib/workspace-model.ts` has one top-level Docs tab and a `code-workspace` sublayout under Gestalten. `validateWorkspace` requires the Docs tab in the top-level tabset and authoring panels in fixed tabsets. Layout storage currently uses version 6 and `Reset Layout` rebuilds the default model.
- `apps/editor/src/components/app.tsx` dispatches one `DOCS_ID` component and saves FlexLayout changes via `onModelChange`.
- `packages/content/src/content-model.ts` already exposes ordered documentation records with path-derived IDs. `packages/content/src/tests/content-model.test.ts` tests ordering; `e2e/workspace-layout.spec.ts` tests dragging within Gestalten, persistence, invalid layouts, and reset.
- `packages/content/src/markdown-content.ts` currently marks all Markdown links to open in a new tab; internal documentation links need separate handling without changing external-link behavior.

## Gate 1: verify the requested drag interaction

Before designing the layout migration, use a minimal local experiment and a real browser interaction to verify whether the installed `flexlayout-react` supports moving a tab **between the Docs and Gestalten sublayouts** in one model. Existing tests only establish moves _within_ Gestalten. Check dragging in both directions, dropping beside an existing panel, reordering within Docs, and serialized model output. Remove the experiment afterward.

If the library does not support cross-sublayout movement, stop and present the smallest viable alternative to Fabian for approval (for example, a single layout tree with both Docs and Gestalten represented in a way that supports these moves). Do not ship two independent layouts that merely look draggable, duplicate tabs, or claim the acceptance goal is met by an open/copy action.

## Implementation sequence (after feasibility gate)

1. **Define the model contract with tests first.** Given ordered documentation IDs, assert one uniquely named tab per document, all initially grouped under Docs, with an unambiguous component/document lookup. Choose a namespaced tab ID distinct from built-in IDs; keep title separate from identity. Check whether nested paths and duplicate titles are handled. Document any limitation exposed by the feasibility gate before committing to a shape.
2. **Build the default layout from content.** Pass the ordered doc records into workspace creation/loading rather than hardcoding a fixed Docs article. Keep the Docs grouping visible and draggable, not a read-only index. Keep existing authoring panels and application tabs intact. A documentation tab's content renders just its own Markdown and heading; remove the concatenating renderer once no longer used.
3. **Dispatch by document identity.** In the app's panel factory, resolve each documentation component/tab to exactly one bundled record. A missing record must not crash the whole workspace without recovery. Do not infer identity from a changeable title or display order.
4. **Validate position without fixing it.** Update workspace validation to allow each documentation panel anywhere the library permits (including Gestalten), while still enforcing one instance per current document and the required application/authoring structure. Do not force moved documentation back into Docs on load.
5. **Preserve existing and evolving workspaces.** Design a version-6 migration that replaces the single Docs article with ordered document panels while preserving other tab positions and sizes where possible. Test that migration rather than silently resetting user layouts. On subsequent launches, add newly bundled documents to Docs without moving existing panels; handle removed documents by pruning their stale tabs without disturbing unrelated layout. Define explicit behavior for invalid duplicates and a missing Docs grouping before writing mutation logic. A version bump alone is not a migration. Keep Reset Layout as an explicit way to restore the latest defaults.
6. **Navigate between panels from Markdown.** Support ordinary relative links to bundled documentation, for example `[Named colors](./named-colors.md)` when that file exists. Resolve the target relative to the source document, normalize it within `content/docs/`, and look up its stable document ID; do not use displayed titles or arbitrary URLs as tab IDs. Select the **existing** tab wherever the user placed it, including activating Gestalten if the target was moved there, without moving or duplicating it. Leave external HTTP(S) links under their current external-link behavior. Define a visible, non-silent outcome for broken or removed internal targets; do not navigate outside bundled docs. Decide fragment/heading behavior separately rather than claiming `#heading` works without heading IDs and scroll handling.
7. **Keep the interaction coherent.** Confirm panel titles, accessible tab names, scrolling, markdown styling, selection after a move, empty Docs grouping, and the user's ability to move a page back. Preserve relevant existing drag styling without changing unrelated panels.

## Test-driven acceptance

- Start with focused failing model tests for default order, identity uniqueness, serialization/load, migration of an existing version-6 workspace, a new/removed document, and rejection or repair of malformed duplicate tabs; then implement and rerun.
- Start with failing Playwright tests: on a fresh workspace, docs are separate tabs in Docs; drag one to Gestalten next to the editor, verify it disappears from Docs and its actual content remains visible; reload and verify the move and user-defined ordering persist; move it back; Reset Layout restores all pages to Docs in authored order. Exercise desktop and browser surfaces that share this model where practical.
- Add focused tests for resolving a relative documentation link, rejecting an unknown or out-of-bundle target, and leaving an external link alone. In Playwright, follow a link to a page still in Docs, then move its target into Gestalten and follow the link again; assert that the existing tab is selected there without a duplicate or relocation. Verify the same flow after installing and restarting the PWA offline, using bundled content with no network access; test a broken target's visible outcome and confirm external links retain their expected handling.
- Run existing `e2e/workspace-layout.spec.ts` coverage for editor/preview mobility, layout recovery, and reset. Run `pnpm test:compact`, `pnpm typecheck:browser`, `pnpm lint`, `pnpm fmt:check`, `pnpm build:browser`, and `pnpm test:e2e`; check console output for unexpected errors.

## Coordination with the content plan

Implement the panel behavior against existing documents first. Then apply the Diátaxis content plan to create smaller pages (notably a standalone Named colors reference); their stable IDs should automatically become new default panels and join existing saved layouts in Docs. Only change existing document paths after an explicit saved-layout ID migration has been specified and tested.

## Done when

A document is a single movable workspace panel; authored order controls a fresh/reset workspace, a user's order and placement survive reload, old layouts retain unrelated work, new/removed pages reconcile safely, and the cross-workspace drag is demonstrated in a real browser test. Relative Markdown links select the existing target panel regardless of its location, including after an installed PWA restarts offline. No documentation content migration is implied by completion of this plan.
