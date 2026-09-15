<!-- ABOUTME: Records the browser-neutral language-service API and v0.9 capability scope. -->
<!-- ABOUTME: Selects direct Monaco integration while deferring LSP and VS Code adapters. -->

# Decision: Language-Service, LSP, and VS Code Extension Scope

Status: Accepted for v0.9

## Decision Question

Which language-service capabilities will GIC v0.9 expose, how will Monaco consume
them, and which LSP or VS Code work is included?

## Decision

- Implement one browser-neutral language-service API over the existing lexer,
  parser, analyzer, and built-in metadata.
- The service exposes structured diagnostics, formatting, completion, hover,
  and signature help.
- Monaco calls the service directly. v0.9 does not add an LSP process, protocol
  transport, or Node-oriented language-server dependency to the shared UI.
- Completion covers GIC keywords, built-ins, and user symbols visible at the
  requested source position.
- Hover and signature help derive from the same declarations and built-in
  signatures that analysis and execution use.
- Formatting supports explicit Format Document and format-on-save, enabled by
  default and configurable.
- Monaco syntax highlighting is included as editor integration, but its token
  rules do not become a second parser.
- The API must permit a later LSP adapter without exposing editor-specific types
  from the core service.
- LSP, a VS Code extension, go-to-definition, and documentation comments are
  outside v0.9.

## Current Baseline

- Structured parser and analyzer diagnostics already cross the worker boundary.
- Source locations use line and column ranges suitable for editor presentation.
- Built-in signatures and reserved names have shared sources of truth.
- The existing textarea surface presents diagnostics but no completion, hover,
  signature help, or formatting.
- [The v0.9 roadmap](../plans/vertical-slice-roadmap.md) integrates the service
  with Monaco after preserving static preview behavior.

## Why This Is a Gate

Without one capability boundary, Monaco, CLI, and later editor adapters could
implement conflicting diagnostics, formatting rules, and built-in descriptions.
The direct API keeps the browser path small while leaving transport adapters
possible after the workshop release.

## Capability Contracts

### Diagnostics

Return plain source-located parse and semantic findings. Runtime failures remain
part of execution results, but use the same presentation range shape.

### Formatting

Return canonical formatted source or explicit text edits. Formatting must be
idempotent and must preserve program meaning. Saving invokes it exactly once
when format-on-save is enabled.

### Completion

Return plain labels, kinds, replacement ranges, and concise documentation for
keywords, built-ins, and analyzer-visible declarations. Reserved names must not
be suggested where declarations are expected.

### Hover

Return concise GIC-facing information for a built-in, function, variable, or
language keyword when the service can identify one at the requested position.

### Signature Help

Return the active callable signature and parameter position for built-ins and
user-defined functions when the surrounding source can be resolved.

## Considered Options

- **Direct service with later adapters — selected.** Keeps browser and desktop
  clients simple, shares capability semantics, and leaves an LSP adapter
  possible without making it a prerequisite.
- **LSP first.** Aligns with conventional editor tooling, but introduces
  transport and Node compatibility work that Monaco does not require.
- **VS Code extension first.** Validates one editor but does not deliver the
  selected workshop application.
- **Diagnostics only.** Matches the prototype but does not meet v0.9's beginner
  discovery and formatting goals.
- **Monaco-local metadata.** Quick to wire, but duplicates language knowledge
  and will drift from analysis and runtime behavior.

## Consequences and Deferred Details

- Service results contain no Monaco, DOM, worker, filesystem, or LSP types.
- Worker placement for service calls is an IDE performance detail; capability
  semantics must remain identical in direct unit tests.
- Documentation strings should be backed by bundled GIC reference material,
  but documentation-comment syntax remains separate.
- Go-to-definition may be added to the same service later after a concrete user
  need and acceptance contract exist.
- A future LSP adapter translates these capabilities rather than reimplementing
  them.

## Decision Checklist

- Direct browser-neutral API selected.
- Diagnostics, formatting, completion, hover, and signature help selected.
- Monaco integration boundary documented.
- Shared metadata requirement documented.
- LSP and VS Code explicitly deferred.
- Documentation comments remain separate.

## Unblocks

- [Browser IDE language assistance](../milestones/browser-ide-language-assistance.md)
- v0.9 roadmap Slice 7

## Related Guidance

- [v0.9 vertical slices](../plans/vertical-slice-roadmap.md)
- [Browser IDE technology and sandbox](browser-ide-technology-sandbox.md)
- [LSP server](<../Language specification.md#6-lsp-server-lspserverts>)
- [VS Code extension](<../Language specification.md#vs-code-extension>)
- [Syntax highlighting](<../Language specification.md#syntax-highlighting>)
- [Built-in functions](<../Language specification.md#built-in-functions>)

## Non-Goals

- Implementing an LSP server, VS Code extension, or `gic lsp` command.
- Selecting desktop provider/authentication architecture.
- Designing documentation comments.
- Adding natural-language code generation.
- Changing lexer, parser, analyzer, or runtime semantics.
