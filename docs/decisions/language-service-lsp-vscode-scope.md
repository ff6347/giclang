<!-- ABOUTME: Records the selected browser language-service route and editor capability scope. -->
<!-- ABOUTME: Keeps diagnostics direct while deferring LSP, VS Code, and broader assistance. -->

# Decision: Language-Service, LSP, and VS Code Extension Scope

Status: Accepted for the vertical browser path

## Decision Question

What language-service capability route will GIC expose for diagnostics, syntax highlighting, editor assistance, LSP integration, and any VS Code extension work? This decision defines scope and adapter boundaries without choosing documentation-comment syntax or changing language semantics.

## Decision

- The browser calls the shared browser-neutral GIC core directly. The first
  browser path does not introduce an LSP bridge, transport protocol, or separate
  capability model.
- Browser diagnostics use the core's structured diagnostic data for parser and
  semantic findings. Presentation remains a browser responsibility.
- Diagnostics are the only language assistance included before Slice 6. Syntax
  highlighting, completion, hover, signature help, and go-to-definition are
  deferred.
- LSP and a VS Code extension are excluded from the vertical browser path. Their
  eventual scope remains unresolved and requires a separate decision before
  implementation.
- Node-oriented LSP dependencies do not enter the browser path.
- Documentation-comment syntax, metadata, and presentation remain a separate
  decision.

The direct route may support future adapters, but this decision does not design
those adapters or stabilize capabilities that no current browser slice needs.

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

## Considered Options

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

## Consequences and Deferred Details

- Browser diagnostics reuse the existing source-location contract without an
  early protocol translation layer.
- The CLI does not gain `gic lsp` by sharing core analysis code.
- The textarea shell does not need syntax-highlighting or completion integration.
- Slice 6 must decide which broader assistance capabilities justify implementation
  before selecting an editor integration or reusable adapter boundary.
- LSP, VS Code, and documentation comments remain explicit future decisions; they
  are not implied by the direct browser service route.

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
