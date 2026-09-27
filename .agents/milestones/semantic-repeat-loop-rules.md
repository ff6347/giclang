<!-- ABOUTME: Defines the semantic repeat-loop and program-loop rules lesson. -->
<!-- ABOUTME: Teaches loop-local variables, loop-block semantics, and animation-specific diagnostics. -->

# Semantic Milestone: Repeat and Program Loop Rules

## Learning Goal

Analyze `repeat` loop variables and program-level `loop` block semantic rules after core name, function, and return analysis exists.

## Prerequisites

Complete or review:

- [Returns and function kind](semantic-returns-function-kind.md)
- [`repeat` statement parsing](parser-repeat-statements.md)
- [Program-level loop parsing](parser-loop-block.md)

## Concepts to Understand

- A repeat loop variable is visible inside the loop body.
- A repeat loop variable should not leak after the loop body.
- Loop variable immutability prevents confusing iteration behavior.
- Start, end, and step expressions are evaluated before the loop variable exists.
- `step == 0` is a runtime error by the specification, not a baseline semantic analyzer diagnostic.
- Setup statements and frame statements may have different declaration and lifetime implications.
- `frameCount` is animation-specific and may need a policy tied to the presence or location of a `loop` block.

## Relevant Specification Links

- [Loops](<../../docs/Language specification.md#loops>)
- [Animation](<../../docs/Language specification.md#animation>)
- [Animated Programs](<../../docs/Language specification.md#animated-programs>)
- [Grammar (EBNF)](<../../docs/Language specification.md#grammar-ebnf>)

## Grammar and AST Shape

There is no grammar change. This lesson uses `RepeatStmt` and the `Program.loopBlock?` / `LoopBlock` shape introduced by the loop-block parser lesson.

## TDD-Oriented Student Checklist

- Accept use of the repeat variable inside the repeat body.
- Report use of the repeat variable after the body.
- Report assignment to the repeat variable inside the body.
- Report repeat variable shadowing if the no-shadowing policy chooses that behavior.
- Check nested repeat scopes, including distinct and conflicting loop variable names.
- Check start, end, and step can use outer names but not the loop variable being introduced.
- Accept one valid tail loop block.
- Add `frameCount` policy tests after the animation gate is decided.

## Non-Goals

- No runtime iteration behavior.
- No default-step runtime behavior.
- No frame scheduler or animation loop execution.
- No render backend.
- No numeric type inference unless explicitly scoped by a decision gate.
- No semantic baseline rejection for `step == 0`; leave zero-step failures to runtime.

## Verification

Use analyzer tests for loop variable scope, reassignment, nested repeat cases, and program loop block cases. Run `pnpm test` and `pnpm typecheck` after implementation changes.

## Decision Gates

- Decide whether numeric checks for start, end, and step belong in this lesson.
- Decide whether `frameCount` is valid only inside `loop`, anywhere in animated programs, or always reserved but conditionally meaningful.
