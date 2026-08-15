<!-- ABOUTME: Collects diagnostic UX enhancements deferred from the source-locations milestone. -->
<!-- ABOUTME: Covers context lines in error output and secondary spans for unclosed delimiters. -->

# Milestone: Diagnostic Enhancements

## Learning Goal

Improve the user-facing diagnostic output beyond the baseline established in [Source Locations and Diagnostic Quality](source-locations-diagnostics.md): give students more context around an error instead of a single line and caret.

## Prerequisites

- [Source Locations and Diagnostic Quality](source-locations-diagnostics.md)

## Enhancements

### Context lines in diagnostics

Tracked as git-bug `2e6b272`.

When an error points at an empty or cryptic line (for example EOF after a trailing newline for a missing closing brace), the caret alone gives no context. Render the line(s) before the error line in the diagnostic output.

- Formatter-only change: `report()` already receives the full source.
- Previous line bounds: end is `lineStart - 1`, start is `source.lastIndexOf("\n", lineStart - 2) + 1`.
- Edge cases: error on line 1 (no previous line), blank previous line (print it anyway).
- The spec's error examples currently show exactly one source line; amend them first so "formatted consistently with spec examples" keeps its meaning.

### Secondary spans for unclosed delimiters

For "unclosed block" errors, point at the opening `{` as a second annotation ("this block opens here ... but is never closed"), the way rustc reports unclosed delimiters. Context lines only help when the opening brace happens to be nearby; a secondary span works for blocks of any size.

- Requires the parser to carry the opening token through `block()` and attach it to the error as a second span.
- Requires the formatter to render two annotations.
- Pairs naturally with the open decision whether AST nodes carry source locations: both thread source positions deeper into the pipeline.

### Full per-node AST spans

Give every AST node its own span (`[first-token.start, last-token.end)`) so errors can underline a whole expression or statement, not just a single token. Useful for type errors ("this expression is not a number") and IDE selection ranges.

- Additive: a `Span` field on AST interfaces; the parser computes it as it builds each node.
- Does not require reworking tokens or existing errors, which continue to point at significant tokens.
- Revisit when a concrete error needs to underline a whole expression; until then, token spans (already retained by AST nodes) cover the spec's shadowing and arity examples.

## Verification

- Formatter tests cover the new output shapes, including the edge cases above.
- The CLI subprocess test's exact stderr expectation is updated and still passes.
- Spec error examples match the implementation's actual output.
