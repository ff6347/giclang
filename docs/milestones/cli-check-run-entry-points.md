<!-- ABOUTME: Explains the required `gic check` and `gic run` command contracts. -->
<!-- ABOUTME: Keeps CLI validation and execution aligned with the shared static core. -->

# Milestone: CLI Check and Run Entry Points

## Learning Goal

Expose stable `check` and `run` commands over the browser-neutral core so GIC
files can be validated and executed without duplicating language behavior.

## Prerequisites

- Source locations survive parsing, analysis, and runtime failures.
- The browser-neutral core exposes parsing, analysis, execution, recorded render
  commands, and structured `print` output.
- Recording backend behavior is deterministic.
- Static browser fixtures provide parity examples.

Animation setup/loop lifecycle and Canvas animation are not prerequisites for
the v0.9 CLI contract.

## Concepts to Understand

- A CLI command is an interface boundary, not a second language pipeline.
- `check` stops after parse and semantic analysis.
- `run` executes through the same core used by the IDE.
- Usage, stdout/stderr routing, diagnostic formatting, and exit status are public
  behavior.
- Expected GIC failures must not leak raw host-language stack traces.

## Included

- `gic check <file>` for parse and semantic validation without execution.
- `gic run <file>` for execution through the shared static core.
- Structured `print` entries presented in execution order.
- Valid, parse-invalid, analysis-invalid, runtime-invalid, missing-file,
  unsupported-command, missing-argument, and extra-argument behavior.
- Package metadata that exposes a usable `gic` executable.
- Stable help, usage, diagnostics, and success/failure statuses.

## Interface Boundary

No grammar or AST changes belong in this milestone.

`check` reads one source file and returns after analysis. `run` reads one source
file and receives the shared execution result, including recorded drawing
commands and structured output. The CLI formats those plain results; it does not
instantiate a separate parser, analyzer, or interpreter.

Before implementation, select and test one presentation contract for drawing
commands:

1. headless execution with `print` output only;
2. a textual representation of recorded commands; or
3. a display backend.

The choice must not silently add PNG, SVG, GIF, server rendering, or watch mode.

## TDD-oriented Student Checklist

- Add a failing process-level test for a valid `check` fixture.
- Add parse-invalid and analysis-invalid tests with source-located diagnostics.
- Prove `check` does not execute by using source that would fail only at runtime.
- Add a valid `run` fixture with ordered structured `print` output.
- Add a runtime failure that preserves prior output and returns a failure status.
- Add file-not-found, unsupported-command, missing-argument, and extra-argument
  tests before implementing dispatch.
- Pin help text and status codes without matching unstable implementation detail.
- Add package-executable smoke coverage.

## Non-Goals

- `gic render` or export commands.
- `gic lsp` or editor integration.
- Browser or desktop window behavior.
- New syntax, semantics, built-ins, animation behavior, or runtime rules.
- A REPL or watch mode.

## Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm fmt:check`
- `pnpm lint`
- Spawned CLI acceptance covers all included outcomes and exact exit statuses.
- A valid fixture passes `gic check`; invalid source fails clearly; `gic run`
  executes through the shared core and follows the selected drawing-command
  presentation.

## Notes / Decision Gates

The only remaining product decision is how `gic run` presents recorded drawing
commands. Resolve it before writing acceptance tests; do not infer export or
server scope from the word “run.”

This milestone is v0.9 roadmap Slice 5 and precedes Monaco migration so the CLI
contract protects core behavior during later host integration.
