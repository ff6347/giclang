<!-- ABOUTME: Records the File menu and Base UI browser integration checkpoint. -->
<!-- ABOUTME: Captures document-menu, modal, layout, and example migration decisions. -->

# File Menu and Base UI

## Decisions

- [decision] The PWA File menu uses Base UI Menubar and Menu components. Open invokes the portable file picker; Save and Save As download source. Recent Files is absent because PWA file names cannot be reopened without persistent handles.
- [decision] Every browser control is either FlexLayout-owned or a Base UI primitive. Save As uses Dialog and Input; discard and recovery use AlertDialog.
- [decision] The visible workspace labels are Gestalten and Agent while stable FlexLayout identifiers remain `code` and `tutor`. The document name and dirty marker appear only in the editor tab.
- [preference] The browser uses a neobrutalist interface: hard black borders, offset black shadows, white and gray surfaces, and dashed splitter guides.
- [decision] The Examples tab owns example selection. Legacy sources are catalogued separately in git-bug issue `4986a39`; runnable ports must use GIC source, generated GIC thumbnails, and original-author attribution.

## Lessons

- [lesson] Base UI portals need an explicit application stacking layer above FlexLayout. Tabset borders change measured tab geometry, so layout tests must assert the intended tolerance rather than an obsolete exact offset.

## Verification

- `pnpm test:e2e` — 61 Firefox tests passed before the File menu landed.
- The GitHub Pages deployment for merged commit `4518462` passed.
