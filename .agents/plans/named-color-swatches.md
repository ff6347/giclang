<!-- ABOUTME: Plans Monaco color swatches for accepted GIC named colors. -->
<!-- ABOUTME: Defines the language-aware detection and user-visible acceptance checks. -->

# Named-color swatches

Issue: `479c072`.

## Goal

Show an accurate color swatch alongside valid named CSS colors in `background`, `fill`, and `stroke` string arguments in the shared Monaco editor. Keep ordinary strings, comments, and invalid color names undecorated.

## Approach

- Register a GIC Monaco color provider in `apps/editor/src/lib/gic-editor.ts`; the editor already enables `colorDecorators`, but the GIC language has no color provider. Do not use CSS-language decoration for all strings.
- Use the accepted set in `packages/core/src/color-names.ts` rather than maintaining another list; expose a narrow `@giclang/core/color-names` package export if the editor needs direct access. Detect literal color arguments using GIC source structure, preserving source ranges for Monaco; do not decorate arbitrary quoted text or matches inside comments. Resolve each accepted CSS color to the RGBA value Monaco requires in the browser, without changing the language core's host-neutral contract.
- Let Monaco refresh swatches when source changes. Keep the feature to named colors; hex and OKLCH support can be separate decisions.

## Red-green verification

1. Add a failing focused test for the source-to-color-range seam: accepted names in each color function, case handling, multiple calls, non-color strings, comments, invalid names, and edits. Confirm it fails, then implement the smallest rule that passes.
2. Add a failing Playwright test in the real Monaco editor for a visible swatch whose color matches a named literal, with removal/replacement and an unrelated string. Confirm it fails before provider registration and passes afterward.
3. Run `pnpm test:compact`, `pnpm typecheck`, `pnpm typecheck:browser`, `pnpm lint`, `pnpm fmt:check`, `pnpm build:browser`, and `pnpm test:e2e`. Review rendered behavior in Firefox and confirm diagnostics/preview still work.

## Done when

The real editor shows and updates swatches only for accepted named colors at color-argument positions, using the same accepted names as execution, and the browser checks pass.
