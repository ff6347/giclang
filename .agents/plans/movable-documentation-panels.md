<!-- ABOUTME: Plans one movable workspace panel per authored documentation page. -->
<!-- ABOUTME: Defines feasibility gates, persistence behavior, implementation slices, and acceptance checks. -->

# Movable documentation panels

## Goal

Each Markdown file under `packages/content/content/docs/` appears exactly once as a documentation panel. Initially, all documentation panels live inside Docs, in authored order. A user can dock Gestalten beside Docs and then drag one page's panel, such as Named Colors, beside the editor or into another permitted workspace location, reorder it, and retain that arrangement after restart. Moving is not copying: the page leaves its previous location. Reset Layout restores the current authored default arrangement.

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
- `apps/editor/src/lib/workspace-model.ts` has one top-level Docs tab and a `code-workspace` sublayout under Gestalten. `validateWorkspace` requires the Docs tab in the top-level tabset and authoring panels in fixed tabsets. Layout storage currently uses version 7, accepts versions 6 and 7, and `Reset Layout` rebuilds the default model.
- `apps/editor/src/components/app.tsx` dispatches one `DOCS_ID` component and saves FlexLayout changes via `onModelChange`.
- `packages/content/src/content-model.ts` already exposes ordered documentation records with path-derived IDs. `packages/content/src/tests/content-model.test.ts` tests ordering; `e2e/workspace-layout.spec.ts` tests dragging within Gestalten, persistence, invalid layouts, and reset.
- `packages/content/src/markdown-content.ts` currently marks all Markdown links to open in a new tab; `colors.md` already links to `colors-named.md`. Internal documentation links need separate handling without changing external-link behavior.

## Gate 1: drag feasibility and navigation decision

A disposable browser experiment used the installed `flexlayout-react` 0.11.0, the current Gestalten sublayout, and a proposed Docs sublayout containing Colors and Drawing. Both were hosted by top-level application tabs in one model, and each model change was saved as JSON and reloaded:

- In the current single top-level tabset, Docs and Gestalten cannot be visible at the same time. Dragging Colors onto the Gestalten **application tab** moved Colors into the **application tabset**, beside Gestalten, not into the hidden editor sublayout.
- After docking the Gestalten application tab beside Docs so both sublayouts were visible, dragging Colors onto Editor moved its existing tab from `docs-workspace` to `code-workspace` beside Editor. The move survived a reload, with one Colors tab in the serialized model.
- Dragging Colors back onto Drawing content moved it into `docs-workspace`, including a split tabset; dragging its tab onto Drawing recombined the tabs. Reordering Drawing before Colors within Docs survived a reload. No document was copied.

**Interaction choice:** Keep the one-at-a-time top-level arrangement by default. First dock the Gestalten application tab beside Docs so both sublayouts are visible; then drag a documentation page into Gestalten. Two moves are acceptable. Dragging a page directly onto the hidden Gestalten tab need not enter its sublayout. Keep both sublayouts in one FlexLayout model; do not add custom drag-hover switching, duplicate tabs, or an open/copy action in place of a real move.

## Implementation sequence (after feasibility gate)

1. **Define the model contract with tests first.** Given ordered documentation IDs, assert one uniquely named tab per document, all initially grouped under Docs, with an unambiguous component/document lookup. Choose a namespaced tab ID distinct from built-in IDs; keep title separate from identity. Check whether nested paths and duplicate titles are handled. Use the two-sublayout shape established in Gate 1.
2. **Build the default layout from content.** Pass the ordered doc records into workspace creation/loading rather than hardcoding a fixed Docs article. Keep the Docs grouping visible and draggable, not a read-only index. Keep existing authoring panels and application tabs in their default top-level arrangement. A documentation tab's content renders just its own Markdown and heading; remove the concatenating renderer once no longer used.
3. **Dispatch by document identity.** In the app's panel factory, resolve each documentation component/tab to exactly one bundled record. A missing record must not crash the whole workspace without recovery. Do not infer identity from a changeable title or display order.
4. **Validate position without fixing it.** Update workspace validation to allow each documentation panel anywhere the library permits (including Gestalten), while still enforcing one instance per current document and the required application/authoring structure. Do not force moved documentation back into Docs on load.
5. **Preserve existing and evolving workspaces.** Design migrations for the currently accepted version-6 and version-7 layouts that replace the single Docs article with ordered document panels while preserving other tab positions and sizes where possible. Test both versions rather than silently resetting user layouts; bump the storage version only with a deliberate compatibility policy. On subsequent launches, add newly bundled documents to Docs without moving existing panels; handle removed documents by pruning their stale tabs without disturbing unrelated layout. Define explicit behavior for invalid duplicates and a missing Docs grouping before writing mutation logic. A version bump alone is not a migration. Keep Reset Layout as an explicit way to restore the latest defaults.
6. **Navigate between panels from Markdown.** Keep the existing `[distinct tab](./colors-named.md)` link in `colors.md` usable after splitting the pages. Resolve relative Markdown targets against the source document, normalize them within `content/docs/`, and look up their stable document ID; do not use displayed titles or arbitrary URLs as tab IDs. Select the **existing** tab wherever the user placed it, including activating Gestalten if the target was moved there, without moving or duplicating it. Leave external HTTP(S) links under their current external-link behavior. Define a visible, non-silent outcome for broken or removed internal targets; do not navigate outside bundled docs. Fragment/heading navigation is outside this work unless separately requested.
7. **Keep the interaction coherent.** Confirm panel titles, accessible tab names, scrolling, markdown styling, selection after a move, empty Docs grouping, and the user's ability to move a page back. Preserve relevant existing drag styling without changing unrelated panels.

## Test-driven acceptance

- Start with focused failing model tests for default order, identity uniqueness, serialization/load, migration of existing version-6 and version-7 workspaces, a new/removed document, and rejection or repair of malformed duplicate tabs; then implement and rerun.
- Start with failing Playwright tests: on a fresh workspace, docs are separate tabs in Docs; drag Gestalten beside Docs, then drag one document into Gestalten beside the editor. Verify it disappears from Docs and its actual content remains visible; reload and verify both moves and user-defined ordering persist; move the page back; Reset Layout restores all pages to Docs in authored order. Exercise desktop and browser surfaces that share this model where practical.
- Add focused tests for resolving a relative documentation link, rejecting an unknown or out-of-bundle target, and leaving an external link alone. In Playwright, follow the Colors → Named Colors link while its target is in Docs, then move the target into Gestalten and follow the link again; assert that the existing tab is selected there without a duplicate or relocation. Verify the same flow after installing and restarting the PWA offline, using bundled content with no network access; test a broken target's visible outcome and confirm external links retain their expected handling.
- Update existing `e2e/content.spec.ts` and `e2e/workspace-layout.spec.ts` expectations for the per-page tabs; retain coverage for editor/preview mobility, layout recovery, and reset. Run `pnpm test:compact`, `pnpm typecheck:browser`, `pnpm lint`, `pnpm fmt:check`, `pnpm build:browser`, `pnpm test:e2e`, and `pnpm test:pwa`; check console output for unexpected errors.

## Coordination with the content plan

Implement the panel behavior against existing documents first, including the already separate Named Colors reference. The Diátaxis content plan may later add smaller pages; their stable IDs should automatically become new default panels and join existing saved layouts in Docs. Only change existing document paths after an explicit saved-layout ID migration has been specified and tested.

## Done when

A document is a single movable workspace panel; authored order controls a fresh/reset workspace, a user's order and placement survive reload, old layouts retain unrelated work, new/removed pages reconcile safely, and a browser test demonstrates docking the workspaces side by side before dragging one page into Gestalten. Relative Markdown links select the existing target panel regardless of its location, including after an installed PWA restarts offline. No documentation content migration is implied by completion of this plan.
