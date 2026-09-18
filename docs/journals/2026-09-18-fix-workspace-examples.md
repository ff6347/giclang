<!-- ABOUTME: Records the workspace and example presentation corrections. -->
<!-- ABOUTME: Captures the FlexLayout cleanup condition and verification results. -->

# Workspace and Example Corrections

## Decisions

- [decision] Selecting a bundled example activates Gestalten after the document replacement completes, including after the student confirms a dirty-document discard.
- [decision] The connected-nodes example uses a black OKLCH background, white fills, and grey strokes so the drawing remains visible on its own canvas.

## Lessons

- [technique] FlexLayout needs both `tabSetEnableDeleteWhenEmpty` and `tabSetEnableClose` to remove an emptied tabset. The default hidden close button remains unavailable while the persisted model enables the cleanup condition.

## Verification

- `pnpm test` — 416 core tests passed.
- `pnpm test:compact` — core and browser-local tests passed.
- `pnpm typecheck:browser`, `pnpm build:browser`, `pnpm lint`, and `pnpm fmt:check` passed.
- `pnpm test:e2e` — 64 Firefox tests passed.

## PWA Tutor Visibility

- [decision] The PWA workspace does not render an unavailable Agent panel. Stored PWA layouts remove the retired tutor tab before validation and persist the cleaned layout.

## Verification

- `pnpm test` — 416 core tests passed.
- `pnpm test:compact`, `pnpm typecheck:browser`, `pnpm lint`, `pnpm fmt:check`, and `pnpm build:browser` passed.
- `pnpm test:e2e` — 65 Firefox tests passed.
