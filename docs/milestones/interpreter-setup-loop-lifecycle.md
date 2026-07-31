<!-- ABOUTME: Defines interpreter lifecycle behavior for setup code and animation loop frames. -->
<!-- ABOUTME: Separates one-time program execution from testable per-frame loop execution. -->

# Interpreter Milestone: Setup and Loop Frame Lifecycle

## Learning Goal

Separate one-time setup execution from frame-by-frame `loop` execution.

## Prerequisites

- [Parser `loop` block](parser-loop-block.md) and [semantic repeat/loop rules](semantic-repeat-loop-rules.md) support for a unique tail `loop` block.
- Interpreter statement execution for [variables and assignments](interpreter-variables-assignments.md), [conditionals](interpreter-conditionals.md), [repeat statements](interpreter-repeat-statements.md), and [functions](interpreter-functions-returns.md).
- [Runtime environment model](runtime-value-environment-errors.md) for persistent globals and per-frame locals.

## Concepts to Understand

- Static programs execute top-level code once.
- Animated programs execute setup code once, then loop body once per frame.
- Frame execution should be callable from tests without browser timers.
- Scheduler lessons provide seams; they do not implement Canvas rendering.

## Relevant Specification Links

- `../Language specification rev 2.md#animation`
- `../Language specification rev 2.md#static-programs`
- `../Language specification rev 2.md#animated-programs`
- `../Language specification rev 2.md#animation-built-ins`
- `../Language specification rev 2.md#grammar-ebnf`

## Existing Code Context

- Earlier parser milestones may not yet include `Program.loopBlock`; this lesson is blocked until that shape exists.
- Existing statement interpreter work should be reusable for both setup and loop bodies.
- Rendering and scheduler milestones should call this lifecycle API rather than duplicating interpreter execution.

## Included

- Program lifecycle entry point for setup execution.
- Testable single-frame execution method for loop bodies.
- Persistent global environment across setup and frames.
- Fresh loop-local environment per frame where semantic rules require it.
- No-loop static program behavior.
- Minimal scheduler seam sufficient for tests.

## Non-Goals

- Browser timers or `requestAnimationFrame`.
- Canvas drawing implementation.
- Built-in `frameCount` timing unless explicitly moved into this lesson.
- Parser/analyzer enforcement of unique tail `loop`.
- Automatic clearing or background drawing between frames.

## Runtime/Backend Boundary Shape

The interpreter should expose a lifecycle API that can be driven by tests, a future scheduler, or a browser adapter:

```txt
prepareProgram(program)
runSetup()
runOneFrame()
```

The exact names are not important. The boundary is important: frame execution must not require DOM, Canvas, or real time.

## Setup Execution

- If the program has no loop block, execute top-level statements once and finish.
- If the program has a loop block, execute all pre-loop setup statements exactly once.
- Function declarations and global variables created during setup remain available to frames.
- Setup errors should stop lifecycle execution through the normal runtime error path.

## Loop Frame Execution

- Each frame executes only the loop body.
- Global bindings persist between frames.
- Loop-local declarations are recreated according to the chosen loop-body scoping model.
- Assignments update globals when the global environment owns the name.
- Frame execution should be deterministic when called repeatedly by a test.

## Scheduler Test Seam

A minimal scheduler seam may call `runOneFrame()` manually. It should not own rendering semantics or install browser timers in this milestone.

## TDD-Oriented Student Checklist

- A no-loop program runs once.
- Pre-loop setup runs exactly once for animated programs.
- Each frame runs the loop body only.
- Globals persist across frames.
- Loop locals are recreated per frame when scoped that way.
- Assignments inside the loop update existing globals.
- Unique tail loop behavior relies on parser/analyzer validation.

## Verification

- Count side effects from setup and loop bodies separately.
- Drive two or three frames manually in a unit test.
- Confirm a setup-only program cannot accidentally run twice.
- Keep scheduler tests fake and synchronous.

## Gates and Open Questions

- Blocked until `Program.loopBlock` or equivalent AST shape exists.
- Scheduler remains a minimal test seam only.
- Defer `frameCount` unless the project explicitly moves it here.
- Loop-body local scope must match the semantic analyzer decision.

## Notes

This milestone creates the lifecycle seam that animation built-ins, recording backends, and browser adapters will depend on later.
