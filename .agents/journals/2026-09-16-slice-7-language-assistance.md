<!-- ABOUTME: Records the Slice 7 language assistance and format-on-save implementation. -->
<!-- ABOUTME: Captures service boundaries, scope recovery, Monaco integration, review, and verification. -->

# Slice 7 Language Assistance

## Scope

Git-bug issues `d56a9b4` and `f4391b4` complete roadmap Slice 7: browser-neutral diagnostics, completion, hover, signature help, formatting, and configurable format-on-save consumed directly by Monaco.

## Implementation

- [decision] `src/language-service.ts` owns plain source-position inputs and editor-neutral results. Monaco converts those results into provider-specific ranges, completion kinds, hover content, and signature data.
- [decision] Keyword and built-in descriptions live beside their shared registries rather than in the browser adapter.
- [technique] `src/language-symbols.ts` parses complete source when possible. For ordinary unfinished blocks, it reparses the latest completed statement or opened block after appending only unmatched closing braces.
- [decision] User-symbol visibility follows analyzer declaration order. Variables become visible after their initializer statement, parameters become visible in their function body, and repeat variables become visible in their repeat body.
- [decision] The `gic.formatOnSave` browser setting defaults to enabled and persists through `localStorage`. `Ctrl`/`Cmd`+`S` provides the formatting seam until Slice 9 adds document persistence; Format Document always applies the shared formatter regardless of the setting.

## Review

- [lesson] Independent Terra review found that using the variable-name offset as its visibility boundary incorrectly exposed `let x = x;`. A regression test now pins initializer behavior.
- [lesson] Assistance must recover scope before a closing brace exists. Tests cover unfinished function and repeat bodies, and Playwright covers a visible local variable from incomplete source.
- [technique] Overloaded built-in signature help selects the first signature that contains the active parameter while retaining all signatures for the client.

## Verification

- `pnpm test` — 416 passed.
- `pnpm test:compact` — passed.
- `pnpm typecheck` — passed.
- `pnpm typecheck:browser` — passed.
- `pnpm lint` — no warnings or errors.
- `pnpm fmt:check` — passed.
- `pnpm build:cli` — passed.
- `pnpm build:browser` — passed with the documented Monaco chunk-size warning.
- `pnpm test:e2e` — 45 Firefox tests passed.
