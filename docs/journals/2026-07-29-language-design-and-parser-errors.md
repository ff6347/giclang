<!-- ABOUTME: Records the language-design and parser-error work completed in this session. -->
<!-- ABOUTME: Preserves decisions, open questions, verification, and follow-up context. -->

# Language Design and Parser Errors

## Summary

Reviewed the current GIC specification and implementation, examined a port of
the connected-nodes sketch, refined the parser test organization, corrected
parser error locations, and documented a proposal for JSDoc-style comments.

## Work Completed

- Read all three language specification revisions and treated revision 2 as the
  current specification.
- Compared `examples/connected-nodes.gic` with its Basil.js source.
- Identified that the port only compares consecutive points because GIC cannot
  currently retain a dynamic collection of generated points.
- Reviewed the implementation state: lexer complete for its milestone, parser
  through conditional statements, and analyzer/interpreter not implemented.
- Split parser tests into variables, expressions, precedence, conditionals, and
  parser-error files while preserving coverage.
- Added `ABOUTME:` headers to the test files and shared test helper.
- Added a failing parser regression test, then changed `consume()` to attach the
  current unexpected token through `peek()` rather than the preceding token.
- Added JSDoc explanations to parser navigation helpers.
- Added a proposed documentation-comments section to language specification
  revision 2.
- Created git-bug `0885b28`, “Support documentation comments in GIC”.
- Reviewed `ff6347/p5-code-sandbox` as a possible foundation for a GIC editor.

## Decisions and Insights

- [decision] GIC examples use camelCase for variables and functions and
  uppercase names for constants; underscores remain legal identifiers.
- [lesson] The connected-nodes algorithm requires stored coordinates and
  pairwise comparisons; retaining only the previous point produces a different
  algorithm.
- [question] A minimal dynamic list should be designed before imports because
  lists unlock proximity graphs, particles, trails, palettes, and other core
  creative-coding patterns.
- [question] Candidate list operations are creation, append, indexed read,
  indexed replacement, and length; nested-list support remains undecided.
- [question] `dist()` may belong in the built-in math API because it is common
  in Processing-style creative coding.
- [direction] The primary execution environment should be browser Canvas, with
  a platform-neutral TypeScript language core and a recording backend for
  interpreter tests.
- [direction] Monaco plus an isolated preview iframe from `p5-code-sandbox` is
  the leading editor starting point; Deno Desktop is a candidate application
  shell for local files and distribution.
- [lesson] Parser errors for missing syntax should reference `peek()`, the
  current unexpected token, rather than `previous()`.
- [technique] Parser tests are easier to navigate when grouped by grammar area:
  variables, expressions, precedence, conditionals, and errors.
- [question] GIC-specific documentation comments should remain smaller than
  full JSDoc and must define syntax, declaration association, stored metadata,
  and IDE presentation before implementation.
- [risk] `git-bug push` could not authenticate to the SourceHut SSH remote using
  its internal SSH client; the bug and identity refs were pushed with Git. No
  external issue-tracker bridge is configured.

## Current State

- Parser error test confirms a missing `)` reports the unexpected `{` token.
- The parser supports declarations, assignments, expressions, calls, and
  `if`/`else if`/`else` statements.
- `repeat`, `func`, `return`, `loop`, analysis, interpretation, and rendering
  remain future milestones.
- Documentation-comment support remains open as git-bug `0885b28`.
- No completed plan files existed to remove.
- No git-bugs were closed because the documentation-comment feature was only
  specified, not implemented.
