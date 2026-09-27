<!-- ABOUTME: Defines interpreter execution for GIC repeat statements and loop variables. -->
<!-- ABOUTME: Documents numeric iteration, loop-variable isolation, and runtime loop guards. -->

# Interpreter Milestone: Repeat Statements

## Learning Goal

Execute numeric repeat loops while keeping loop-variable scope isolated.

## Prerequisites

- [Parser `repeat` statements](parser-repeat-statements.md) milestone.
- [Interpreter expressions](interpreter-expressions.md) and [variables](interpreter-variables-assignments.md) milestones.
- [Runtime environment model](runtime-value-environment-errors.md), especially child environments and assignment ownership.

## Concepts to Understand

- Loop bounds are expressions that should be evaluated before iteration begins.
- The loop variable is a temporary binding visible to the body.
- Body side effects on outer variables persist after the loop.
- Static analyzer lessons decide legality such as loop-variable reassignment; runtime guards handle dynamic numeric behavior.

## Relevant Specification Links

- `../../docs/Language specification.md#control-flow`
- `../../docs/Language specification.md#scoping-rules`
- `../../docs/Language specification.md#grammar-ebnf`
- `../../docs/Language specification.md#error-message-guidelines`

## Existing Code Context

- `parser-repeat-statements.md` defines `RepeatStmt` with optional `step`.
- Expression evaluation can compute start, end, and step values.
- Environment chaining can isolate loop variables while preserving access to outer names.

## Included

- Evaluate start, end, and optional step expressions.
- Apply default step `1` when omitted.
- Execute positive and negative iteration.
- Reject zero step at runtime.
- Support fractional numeric steps unless later gates restrict them.
- Keep the loop variable visible only inside the loop body.
- Preserve mutations to outer variables performed by the body.

## Non-Goals

- Parser changes to the repeat grammar.
- Static checks for numeric bounds or loop-variable reassignment.
- `break`, `continue`, `while`, or general `for` loops.
- Rendering-specific loop behavior.
- Animation `loop {}` lifecycle.

## Grammar and AST Shape

The parser supplies:

```txt
RepeatStmt
  variable, start, end
  step?, body
```

The `variable` is a token, while `start`, `end`, and `step` are expressions. The body is a list of statements.

## Repeat Iteration Semantics

- Evaluate start, end, and step once before the first iteration.
- Require all three numeric values after defaulting step.
- A positive step iterates while the current value is `< end`.
- A negative step iterates while the current value is `> end`.
- The end value is exclusive; do not execute when the current value equals the end.
- A zero step is a runtime error to avoid an infinite loop.

For example, `repeat(i, 1, 4)` exposes `1`, `2`, and `3` to the body.

## Loop Variable Scope

Each repeat execution should create loop-variable storage that does not leak after the loop. Nested repeats with the same or different names must keep their loop variables separate according to the semantic shadowing decision.

The body may still mutate an outer variable found through the environment chain:

```txt
let total = 0;
repeat(i, 1, 4) { total = total + i; }
```

This fragment illustrates the effect only; students should still build the behavior through environment operations.

## TDD-Oriented Student Checklist

- Bounds and step are evaluated once.
- Omitted step defaults to `1`.
- Positive iteration executes expected body counts.
- Negative iteration executes expected body counts.
- Zero step reports a runtime error.
- Fractional steps behave consistently and are tested if allowed.
- Loop variable is visible only in the body.
- Side effects on outer variables persist after the loop.
- Nested repeat variables remain separate.

## Verification

- Use counters or recorded assignments to observe iteration counts.
- Add tests where bound expressions mutate a variable to prove one-time evaluation.
- Test that reading the loop variable after the loop fails or is rejected by the analyzer.
- Include nested repeat tests before adding rendering loops.

## Resolved Decisions

- Fractional iterator values use `start + turn * step` with an integer turn counter, avoiding accumulated addition drift.
- Loop-variable reassignment is rejected by the analyzer.
- Repeat ends are exclusive and use `< end` for positive steps and `> end` for negative steps.

## Notes

Do not confuse `repeat(...) {}` with animation `loop {}`. Repeat is a finite statement; animation lifecycle is a later milestone.
