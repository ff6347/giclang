<!-- ABOUTME: Defines the parser lesson for the program-level loop block. -->
<!-- ABOUTME: Teaches setup-versus-animation AST shape, parser errors, and TDD checks without runtime code. -->

# Parser Milestone: Program-Level Loop Block

## Learning Goal

Parse `loop { ... }` as an optional program-level animation tail that is separate from ordinary statements. Students should understand that setup code belongs in the program body and frame code belongs in the single trailing `loop` block.

## Prerequisites

Complete or review:

- [Build the lexer](lexer.md)
- [Build the basic parser and AST](parser-basic.md)
- [Parse assignments](parser-assignment.md)
- [Parse `if` statements](parser-if-statements.md)
- [Parse `repeat` statements](parser-repeat-statements.md)
- [Parse function declarations and returns](parser-functions.md)

## Concepts to Understand

- Setup code runs once, while animation frame code lives under `loop`.
- `loop` is a program-level tail, not an ordinary nested statement.
- A program may have no loop block or exactly one loop block.
- If present, the loop block must be the last top-level construct.
- Tail grammar is simpler than allowing `loop` anywhere in `statement()`.
- With `exactOptionalPropertyTypes`, optional AST fields should be absent when not present, not assigned `undefined`.

## Relevant Specification Links

- [Animation](<../Language specification rev 2.1.md#animation>)
- [Animated Programs](<../Language specification rev 2.1.md#animated-programs>)
- [Grammar (EBNF)](<../Language specification rev 2.1.md#grammar-ebnf>)
- [Parser component](<../Language specification rev 2.1.md#2-parser-parserts>)

## Grammar and AST Shape

```ebnf
program = statement* loopBlock?;
loopBlock = "loop" block;
```

Represent the result as a `Program` with its existing setup statements plus an optional `loopStatement` field. The loop node should describe the block body, for example as `LoopStatement.body`, without making `loop` part of the normal statement union unless a later design gate chooses that route.

## TDD-Oriented Student Checklist

- Parse existing programs that do not contain `loop` without changing their AST shape except for the absent optional field.
- Parse `loop {}` as a program with no setup statements and an empty animation body.
- Parse setup statements followed by a loop block.
- Parse function declarations before the loop block.
- Reject a top-level statement after the loop block.
- Reject a second top-level loop block.
- Reject `loop` without the required opening `{`.
- Reject a loop block with a missing closing `}`.

## Non-Goals

- No animation runtime or scheduler behavior.
- No frame lifecycle or repeated execution semantics.
- No `frameCount` validation or value behavior.
- No render backend, canvas, or browser work.

## Verification

Use parser-focused tests to show both accepted and rejected loop-tail programs. If there is an AST simplifier or snapshot helper, verify it includes `loopStatement` only when present. Run the normal documentation-adjacent implementation checks when the student reaches the code milestone: `pnpm test` and `pnpm typecheck`.

## Decision Gates

- Decide parser diagnostic ownership/quality for duplicate or non-tail `loop` cases, including expected message and source location.
