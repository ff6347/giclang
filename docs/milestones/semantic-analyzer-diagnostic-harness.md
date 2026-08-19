<!-- ABOUTME: Defines the first semantic analyzer lesson and diagnostic harness. -->
<!-- ABOUTME: Teaches AST traversal and diagnostic collection before adding semantic rules. -->

# Semantic Milestone: Analyzer Diagnostic Harness

## Learning Goal

Build a test-first analyzer shell that walks the AST and reports diagnostics with source locations before adding specific semantic rules.

## Prerequisites

Complete or review:

- [Built-in signatures and reserved names](built-in-signatures-reserved-names.md)
- [Source locations and diagnostics](source-locations-diagnostics.md)
- [Core API and project structure](browser-neutral-core-api.md)

## Concepts to Understand

- An analyzer consumes syntax that has already parsed successfully.
- A visitor or walker should cover every current AST node kind.
- Semantic diagnostics are different from lexer and parser errors, even when they share formatting.
- Test helpers can parse source, run the analyzer, and simplify diagnostics for readable assertions.
- The analyzer should stay platform-neutral so CLI, browser, and tests can all use it.

## Relevant Specification Links

- [Semantic Analyzer component](<../Language specification rev 2.1.md#3-semantic-analyzer-analyzerts>)
- [Implementation Architecture](<../Language specification rev 2.1.md#implementation-architecture>)
- [Error Message Guidelines](<../Language specification rev 2.1.md#error-message-guidelines>)

## Grammar and AST Shape

There is no grammar change. The analyzer consumes the current `Program`, `Statement`, and `Expression` shapes produced by the parser.

## TDD-Oriented Student Checklist

- Replace any placeholder analyzer behavior such as throwing `tbd` with the chosen diagnostic contract.
- Check a valid simple program produces no semantic diagnostics.
- Build a harness that parses, analyzes, and simplifies diagnostic output for assertions.
- Walk nested statements and expressions, not only top-level nodes.
- Cover every current statement and expression node kind in traversal tests or coverage-oriented assertions.
- Avoid enforcing variable, function, return, or built-in rules before their dedicated lessons.

## Non-Goals

- No variable or function name rules.
- No built-in validation.
- No interpreter or runtime values.
- No LSP, editor, or browser integration.

## Verification

Use analyzer smoke tests and at least one nested traversal test. Run `pnpm test` and `pnpm typecheck` when implementation work begins.

## Decision Gates

- Decide whether the analyzer API returns diagnostics, throws expected semantic errors, or adapts between both at a boundary.
- Decide whether the analyzer should collect multiple diagnostics or stop after the first one.
