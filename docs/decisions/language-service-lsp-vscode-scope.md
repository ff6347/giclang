<!-- ABOUTME: Defines the unresolved language-service, LSP, and VS Code scope decision gate. -->
<!-- ABOUTME: Compares direct service APIs, LSP, VS Code, and capability scope without selecting one. -->

# Decision: Language-Service, LSP, and VS Code Extension Scope

Status: Unresolved

## Decision Question

What language-service capability route will GIC expose for diagnostics, syntax highlighting, editor assistance, LSP integration, and any VS Code extension work? This decision defines scope and adapter boundaries without choosing documentation-comment syntax or changing language semantics.

## Current Baseline

- [Memory](../MEMORY.md) keeps the lexer, parser, analyzer, and interpreter platform-neutral while browser Canvas remains the favored primary runtime direction.
- Browser IDE diagnostics require some service route, even if that route is a direct shared API rather than LSP.
- The specification names LSP and VS Code extension work, while the CLI milestone defers `gic lsp` rather than including it with the first CLI entry points.
- Documentation comments remain a separate decision from language-service transport and editor scope.
- Relevant milestones:
  - [Build the browser IDE MVP with diagnostics and static preview](../milestones/browser-ide-mvp-diagnostics-static-preview.md)
  - [Add browser IDE language assistance](../milestones/browser-ide-language-assistance.md)
- Relevant specification anchors:
  - [LSP server](<../Language specification.md#6-lsp-server-lspserverts>)
  - [VS Code extension](<../Language specification.md#vs-code-extension>)
  - [Syntax highlighting](<../Language specification.md#syntax-highlighting>)
  - [Live preview panel](<../Language specification.md#live-preview-panel>)
  - [CLI tool](<../Language specification.md#cli-tool>)

## Why This Is a Gate

Browser IDE milestones need a defined route for diagnostics, parse errors, semantic errors, and later language assistance. The gate also prevents accidental expansion from shared analysis helpers into `gic lsp`, VS Code packaging, or documentation-comment UI before those scopes are explicitly resolved.

## Options and Consequences

- Option: `Direct shared language-service API first; no LSP or VS Code yet`
  - Consequences: gives the browser IDE a service route with a small transport surface; keeps Node-oriented LSP dependencies out of the browser path; leaves LSP and VS Code scope unresolved; requires API boundaries stable enough for later adapters.
- Option: `Layered direct service API with later LSP and VS Code adapters`
  - Consequences: separates core capabilities from transports; allows browser integration to use direct calls while later adapters consume the same service layer; requires upfront capability modeling for diagnostics, ranges, completions, hover, and syntax tokens.
- Option: `LSP-first using vscode-languageserver`
  - Consequences: aligns with the specification's LSP section and common editor tooling; may complicate pure browser integration because `vscode-languageserver` is Node-oriented; risks pulling protocol concerns into early diagnostics work.
- Option: `VS Code extension first`
  - Consequences: exercises one concrete editor integration and can validate diagnostics and highlighting UX; may leave browser IDE integration indirect; couples early work to VS Code packaging and extension APIs.
- Option: `Syntax highlighting only for first pass`
  - Consequences: limits initial editor capability to a small visible feature; does not satisfy browser IDE diagnostic needs by itself; delays questions about error ranges, semantic analysis access, and runtime preview integration.

## Questions Before Choosing

- What minimum diagnostic capabilities are required for the browser IDE MVP?
- Are syntax highlighting, hover, completion, and go-to-definition in scope for the first language-assistance milestone?
- Does the browser IDE call a direct API, an LSP bridge, or an adapter that hides transport details?
- Can a Node-oriented LSP package run acceptably in the browser target, or is a browser-native service boundary needed?
- Which capabilities depend on documentation comments, and which remain independent?
- How does the CLI avoid silently gaining `gic lsp` while sharing analysis code?

## Decision Checklist

- Service capability boundary documented.
- Diagnostic data model documented for browser IDE use.
- LSP scope explicitly unresolved, included, or excluded for the relevant phase.
- VS Code extension scope explicitly unresolved, included, or excluded for the relevant phase.
- Browser compatibility risks documented for any Node-oriented dependency.
- Documentation comments tracked as a separate decision.

## Unblocks

- [Build the browser IDE MVP with diagnostics and static preview](../milestones/browser-ide-mvp-diagnostics-static-preview.md)
- [Add browser IDE language assistance](../milestones/browser-ide-language-assistance.md)

## Related Guidance

- [Memory](../MEMORY.md)
- [Lessons](../LESSONS.md)
- [LSP server](<../Language specification.md#6-lsp-server-lspserverts>)
- [VS Code extension](<../Language specification.md#vs-code-extension>)
- [Syntax highlighting](<../Language specification.md#syntax-highlighting>)
- [Live preview panel](<../Language specification.md#live-preview-panel>)
- [CLI tool](<../Language specification.md#cli-tool>)

## Non-Goals

- Selecting browser IDE editor technology or sandbox model.
- Selecting documentation-comment syntax, metadata, or rendering.
- Adding `gic lsp` to the CLI milestone by implication.
- Changing lexer, parser, analyzer, or runtime semantics.
