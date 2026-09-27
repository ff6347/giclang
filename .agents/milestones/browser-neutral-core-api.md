<!-- ABOUTME: Defines the browser-neutral core API and project-structure lesson. -->
<!-- ABOUTME: Teaches stable boundaries between language core, CLI, browser UI, and future render backends. -->

# Milestone: Browser-Neutral Core API and Project Structure

## Learning Goal

Define a platform-neutral core API that exposes lex, parse, and check results without depending on Node, browser APIs, canvas APIs, or rendering.

## Prerequisites

Complete or review:

- [Source locations and diagnostics](source-locations-diagnostics.md)
- [Loop-block parser milestone](parser-loop-block.md)
- All earlier parser milestones linked from [the lesson index](../LESSONS.md)

## Concepts to Understand

- Public API types should be easier to depend on than internal helper functions.
- Dependency direction should flow from CLI/UI into core, not from core into CLI/UI.
- Result objects can carry either successful values or diagnostics without forcing platform-specific formatting.
- A thin CLI wrapper can parse arguments and print diagnostics while delegating language work to core.
- Stable exports make future tests, playgrounds, and render backends easier to compose.

## Relevant Specification Links

- [Implementation Architecture](<../../docs/Language specification.md#implementation-architecture>)
- [Component Details](<../../docs/Language specification.md#component-details>)
- [Project Structure](<../../docs/Language specification.md#project-structure>)
- [Memory](../MEMORY.md)

## Grammar and AST Shape

This is explicitly not a grammar lesson. The boundary shape is exported core API and type names. AST behavior should not change as part of this milestone.

## TDD-Oriented Student Checklist

- Import the core language API without importing `main.ts` or a CLI entry point.
- Check parse or check operations return an AST on success or diagnostics on failure according to the chosen contract.
- Confirm core code does not import `process`, `fs`, DOM, Canvas, or render backend APIs.
- Export useful student-facing types such as `Program`, token, and diagnostic types.
- Keep CLI responsibilities thin: argument handling, file IO, exit status, and formatting.

## Non-Goals

- No new analyzer rules.
- No interpreter or runtime behavior.
- No render backend or canvas integration.
- No CLI subcommand expansion.
- No package publishing or npm API guarantee beyond this learning project.

## Verification

If the API exists in code, add small import tests that use the public entry point. Run `pnpm test`, `pnpm typecheck`, and inspect core imports for accidental platform dependencies.

## Decision Gates

- Decide the final core entry point name, such as `src/index.ts`, `src/core.ts`, or another shape.
