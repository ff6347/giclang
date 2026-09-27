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

## PWA Settings

- [decision] PWA Settings contains only the format-on-save and workspace-reset controls. Format on save uses the accessible Base UI Checkbox rather than a native input.

## Verification

- `pnpm test` — 416 core tests passed.
- `pnpm test:compact`, `pnpm typecheck:browser`, `pnpm lint`, `pnpm fmt:check`, and `pnpm build:browser` passed.
- `pnpm test:e2e` — 65 Firefox tests passed.

## Monaco Presentation

- [decision] GIC disables Monaco color decorators because its built-in RGB/HSL/hex picker cannot represent GIC’s numeric OKLCH color values. Long source lines wrap at the smaller of the editor width and the 50-column teaching guide.

## Verification

- `pnpm test` — 416 core tests passed.
- `pnpm test:compact`, `pnpm typecheck:browser`, `pnpm lint`, `pnpm fmt:check`, and `pnpm build:browser` passed.
- `pnpm test:e2e` — 67 Firefox tests passed.

## Monaco Color Picker

- [decision] GIC retains Monaco color decorators for CSS string colors. The picker’s RGB/HSL/hex format control is hidden and inactive because GIC’s numeric color arguments use OKLCH.

## Verification

- `pnpm test` — 416 core tests passed.
- `pnpm test:compact`, `pnpm typecheck:browser`, `pnpm lint`, `pnpm fmt:check`, and `pnpm build:browser` passed.
- `pnpm test:e2e` — 66 Firefox tests passed.
