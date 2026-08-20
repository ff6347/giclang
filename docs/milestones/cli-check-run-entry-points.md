<!-- ABOUTME: Explains the CLI check and run milestone for the GIC curriculum. -->
<!-- ABOUTME: Defines command boundaries, prerequisites, non-goals, and verification for student implementation. -->

# Milestone: CLI Check and Run Entry Points

## Learning Goal

Expose `check` and `run` command entry points over the completed browser-neutral core pipeline so students can validate and execute `.gic` files from a terminal.

## Prerequisites

- Source locations are preserved from lexer and parser output into diagnostics.
- A browser-neutral core API exists for parse, analyze, interpret, and render-facing execution.
- The analyzer harness reports syntax and semantic diagnostics in a testable shape.
- Built-in call errors are defined for wrong names, arity, and argument types.
- The runtime value, environment, and error model is complete.
- Setup and `loop` lifecycle behavior is defined by the interpreter lessons.
- A render backend interface is available for the already-selected CLI `run` backend.
- A recording backend exists for deterministic non-browser assertions.
- Browser Canvas static and animation backends exist if the already-selected `run` backend is browser display behavior.

## Concepts to Understand

- A CLI command is an interface boundary, not a new language feature.
- `check` should stop after syntax and semantic validation.
- `run` should execute the same core pipeline used by tests and browser-facing integrations.
- Exit status, diagnostics, and usage errors are part of the public contract.
- Terminal behavior should not hide analyzer or runtime failures behind raw stack traces.

## Relevant Specification Links

- [File Extension](<../Language specification rev 2.2.md#file-extension>)
- [Implementation Architecture](<../Language specification rev 2.2.md#implementation-architecture>)
- [Semantic Analyzer component](<../Language specification rev 2.2.md#3-semantic-analyzer-analyzerts>)
- [Interpreter component](<../Language specification rev 2.2.md#4-interpreter-interpreterts>)
- [Render Backends](<../Language specification rev 2.2.md#5-render-backends>)
- [CLI Tool](<../Language specification rev 2.2.md#cli-tool>)
- [Error Message Guidelines](<../Language specification rev 2.2.md#error-message-guidelines>)
- [Integration Tests](<../Language specification rev 2.2.md#integration-tests>)

## Included

- A `gic check` entry point for validating a `.gic` file without drawing.
- A `gic run` entry point for executing a `.gic` file through the completed interpreter and an already-selected backend.
- File-not-found, invalid usage, and help behavior appropriate for a beginner-facing tool.
- Diagnostic formatting that preserves source evidence from earlier pipeline stages.
- Tests that prove commands call the existing core pipeline instead of duplicating language logic.

## Grammar and AST Shape / Interface Boundary

No grammar or AST changes belong in this milestone.

The boundary is command-oriented: `check` accepts source input and reports syntax or semantic results without creating render output, while `run` accepts source input and executes through the interpreter and an already-selected backend. Exit codes, stdout or stderr routing, and diagnostic formatting are observable CLI interface behavior.

## TDD-oriented Student Checklist

- Start with a failing test where a valid fixture succeeds under `check`.
- Add a failing test where an invalid fixture fails under `check` with a source-located diagnostic.
- Add a `run` smoke test that proves execution reaches the already-selected backend.
- Add file-not-found behavior before polishing happy-path output.
- Add invalid usage and help behavior for missing or extra arguments.
- Add assertions for diagnostic formatting without matching an entire long paragraph.

## Non-Goals

- `gic render` or export commands.
- `gic lsp` or editor integration.
- Browser IDE behavior.
- Deno Desktop packaging.
- New syntax, semantics, built-ins, or runtime rules.
- A REPL.

## Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm fmt:check`
- `pnpm lint`
- Manual fixture behavior: a valid file passes `gic check`, an invalid file fails clearly, and `gic run` executes through the already-selected backend.

## Notes / Decision Gates

No new decision gate is required for `check` and `run` if the prior core and backend milestones are complete.

Defer LSP startup and render/export commands to their own decision documents or later milestones. Do not silently add `gic lsp`, PNG, GIF, SVG, or server rendering behavior while implementing this lesson.
