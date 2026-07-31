<!-- ABOUTME: Explains browser IDE language-assistance features for GIC. -->
<!-- ABOUTME: Defines language-service decision gates, capability scope, non-goals, and verification. -->

# Milestone: Browser IDE Language Assistance

## Learning Goal

Add beginner-friendly completions, hover or signature help, and definition features only as selected by the language-service decision.

## Prerequisites

- `../decisions/language-service-lsp-vscode-scope.md` is a blocking decision document for LSP, direct service APIs, and VS Code scope.
- `../decisions/browser-ide-technology-sandbox.md` is a blocking decision document for the browser integration boundary.
- [Browser IDE MVP diagnostics and static preview](browser-ide-mvp-diagnostics-static-preview.md) is complete.
- [Browser IDE animation and runtime-error UX](browser-ide-animation-runtime-error-ux.md) is complete.
- Built-in signatures and reserved names have a stable source of truth.
- Semantic function analysis is available for selected user-defined function assistance capabilities.
- Return analysis is available for selected value-returning and void function assistance capabilities.
- Variable declaration, assignment, and no-shadowing rules are enforced by the analyzer for selected scope-aware capabilities.

## Concepts to Understand

- Language assistance is useful only when it reflects the actual parser and analyzer state.
- Capability scope must come from the decision document, not from hidden implementation preference.
- Built-in signatures should be shared data, not duplicated strings in the UI.
- Scope-aware suggestions should avoid names that are not visible at the cursor.
- Unselected capabilities should be documented as absent instead of half-implemented.

## Relevant Specification Links

- [LSP Server component](<../Language specification rev 2.md#6-lsp-server-lspserverts>)
- [VS Code Extension](<../Language specification rev 2.md#vs-code-extension>)
- [Syntax Highlighting](<../Language specification rev 2.md#syntax-highlighting>)
- [Built-in Functions](<../Language specification rev 2.md#built-in-functions>)
- [User-Defined Functions](<../Language specification rev 2.md#user-defined-functions>)
- [Scoping Rules](<../Language specification rev 2.md#scoping-rules>)
- [Error Message Guidelines](<../Language specification rev 2.md#error-message-guidelines>)

## Included

- Built-in completions if the language-service decision selects completion support.
- Signature or help presentation for built-ins and user-defined calls if selected.
- User symbol assistance based on analyzer-visible declarations if the language-service decision selects it.
- Scope-aware exclusion of unavailable or reserved names for selected suggestion or navigation capabilities.
- Hover and definition behavior only if selected by the language-service decision.
- Browser smoke coverage for the selected capability set.

## Grammar and AST Shape / Interface Boundary

No grammar or AST changes belong in this milestone.

The service boundary exposes only the selected language-assistance capabilities. Data comes from lexer, parser, analyzer symbols, and built-in signature tables. Do not silently choose between LSP, a direct browser API, or VS Code integration; that choice must come from `../decisions/language-service-lsp-vscode-scope.md`.

## TDD-oriented Student Checklist

- Start with a failing built-in completion test if completions are selected.
- Add signature or help behavior for a selected built-in call if selected.
- Add user symbol assistance for functions or variables that are visible at the cursor only if selected.
- Add scope-aware exclusion cases for unavailable names and reserved words only for selected capabilities.
- Add hover or definition tests only when those capabilities are selected.
- Add a browser smoke check showing suggestions through the selected IDE boundary.

## Non-Goals

- Deciding whether the implementation uses LSP, direct service calls, or VS Code APIs.
- Documentation comments.
- Fuzzy prompt mode or natural-language code generation.
- New built-ins or imports.
- Extra type inference beyond the analyzer's existing information.
- Desktop packaging.

## Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm fmt:check`
- `pnpm lint`
- Service tests cover every selected capability.
- Browser smoke shows suggestions or help through the selected UI path.
- Reserved names are excluded from inappropriate suggestions when selected capabilities expose suggestions.
- Unselected capabilities are documented as absent rather than silently exposed.

## Notes / Decision Gates

This milestone is blocked until `../decisions/language-service-lsp-vscode-scope.md` selects the language-service shape and capability scope. It also depends on `../decisions/browser-ide-technology-sandbox.md` for browser integration.

Documentation comments remain a separate decision or milestone. Do not add them here as a shortcut for hover text.
