<!-- ABOUTME: Frames the unresolved GIC documentation-comment syntax decision. -->
<!-- ABOUTME: Notes the open git-bug tracking item without claiming resolution. -->

# Design Documentation Comments

Status: Unresolved

## Decision Question

Should GIC support documentation comments, and if so, what syntax, metadata, and IDE behavior should they have?

## Current Baseline

Revision 2.2 currently supports `//` single-line comments only and says proposed documentation comments are not part of the current syntax. The proposal mentions a small GIC-specific documentation format for functions, parameters, return values, variables, and reusable library code. Open git-bug `0885b28` tracks documentation-comment support.

## Why This Is a Gate

Documentation comments affect lexing, parsing or comment retention, AST association, analyzer metadata, hover text, completions, examples, and possible library documentation. Implementing editor assistance before the format is chosen may duplicate or contradict later metadata rules.

## Options and Consequences

- **`///` line documentation comments**
  - Keeps comments line-oriented and close to the existing `//` syntax.
  - Requires rules for grouping adjacent lines and attaching them to declarations.
- **`/** */` block documentation comments**
  - Provides a familiar documentation-comment shape from JavaScript-like ecosystems.
  - Adds multi-line comment lexing that revision 2.2 currently excludes.
- **Structured ordinary `//` comments**
  - Reuses the existing comment form with conventions for tags or declaration proximity.
  - May make ordinary comments and documentation metadata harder to distinguish.
- **External metadata only**
  - Keeps the language syntax unchanged.
  - Moves documentation association into tools, examples, or library metadata outside `.gic` source.

## Questions Before Choosing

- Which declarations can receive documentation: functions, parameters, variables, built-ins, libraries, or examples?
- Is metadata free text only, or are tags for parameters and return values supported?
- Does the lexer preserve documentation comments while discarding ordinary comments?
- How are comments associated with declarations across blank lines or intervening ordinary comments?
- What should hover, completion, or signature help display in the browser IDE?

## Decision Checklist

- Select or reject a documentation-comment syntax.
- Define declaration association rules.
- Define supported metadata fields and unsupported JSDoc features.
- Specify lexer/parser/analyzer representation if comments are retained.
- Define browser IDE and language-service presentation behavior.
- Add tests only after syntax and metadata are specified.

## Unblocks

- Future documentation-comment implementation milestones if documentation comments are selected.
- Future hover, completion, signature-help, built-in documentation, or library documentation work that chooses to consume documentation-comment metadata.

## Related Guidance

- [Comments](<../../docs/Language specification.md#comments>)
- [Proposed Documentation Comments](<../../docs/Language specification.md#proposed-documentation-comments>)
- [LSP Server component](<../../docs/Language specification.md#6-lsp-server-lspserverts>)
- [Browser IDE language assistance](../milestones/browser-ide-language-assistance.md)
- [Language design journal](../journals/2026-07-29-language-design-and-parser-errors.md)

## Non-Goals

- Claiming git-bug `0885b28` is resolved.
- Implementing full JavaScript JSDoc compatibility.
- Selecting a language-service transport.
- Adding imports or package documentation behavior.
