<!-- ABOUTME: Explains Monaco language assistance and formatting for GIC v0.9. -->
<!-- ABOUTME: Defines direct service capabilities, shared metadata, non-goals, and verification. -->

# Milestone: Browser IDE Language Assistance

## Learning Goal

Provide beginner-friendly completion, hover, signature help, syntax highlighting, and formatting through Monaco and a browser-neutral GIC service.

## Prerequisites

- [Language-service scope](../decisions/language-service-lsp-vscode-scope.md) selects direct diagnostics, formatting, completion, hover, and signature help.
- [Browser IDE technology](../decisions/browser-ide-technology-sandbox.md) selects Monaco and worker-isolated preview.
- Monaco static editing, diagnostics, and preview behavior are working.
- Built-in signatures and reserved names have one shared source of truth.
- Analyzer-visible declarations and source locations are available at requested positions.

## Concepts to Understand

- Assistance must reflect the actual parser and analyzer state.
- Monaco is an adapter, not the owner of GIC language knowledge.
- Built-in signatures and descriptions must not be duplicated in UI code.
- Scope-aware suggestions exclude declarations that are not visible.
- Formatting is language behavior and must be deterministic and idempotent.

## Included

- Browser-neutral APIs for diagnostics, formatting, completion, hover, and signature help.
- GIC syntax highlighting in Monaco without introducing a second parser.
- Keyword and built-in completion.
- Completion for user functions and variables visible at the cursor.
- Exclusion of reserved or unavailable names where declarations are expected.
- Concise hover for resolvable GIC symbols and language elements.
- Active signature and parameter help for built-ins and user-defined calls.
- Explicit Format Document.
- Format-on-save enabled by default and configurable.
- Shared-UI Playwright acceptance for every visible capability.

## Interface Boundary

No grammar or AST changes belong in this milestone.

Service inputs are source text and source positions. Outputs are plain editor-neutral values. Monaco translates those values into its provider APIs. No LSP process, transport, filesystem, desktop, or provider dependency enters the service.

## TDD-oriented Student Checklist

- Start with failing service tests for each selected capability.
- Pin built-in completion and signature help from shared metadata.
- Pin visible and hidden user symbols at nested positions.
- Pin hover at valid, incomplete, and unrelated positions.
- Pin formatting idempotence and parse-equivalent output.
- Integrate one capability at a time through Monaco and Playwright.
- Add explicit-format and format-on-save acceptance, including the disabled setting.

## Non-Goals

- LSP, `gic lsp`, or a VS Code extension.
- Go-to-definition.
- Documentation-comment syntax or rendering.
- Natural-language generation.
- New built-ins or imports.
- Type inference beyond analyzer-owned information.
- Desktop packaging.

## Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm fmt:check`
- `pnpm lint`
- Service tests cover all selected capability results and edge cases.
- Playwright drives Monaco completion, hover, signature help, explicit format, and format-on-save.
- Reserved and out-of-scope names are not offered incorrectly.
- Formatted valid programs retain equivalent parsed behavior.

## Notes / Decision Gates

Capability scope is fixed by the accepted decision. Exact Monaco provider registration and worker placement are implementation details; they must not change service semantics or introduce editor-specific core types.

This milestone corresponds to v0.9 roadmap Slice 7.
