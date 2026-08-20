<!-- ABOUTME: Describes interpreter execution for GIC if, else-if, and else statements. -->
<!-- ABOUTME: Keeps branch selection runtime-focused while leaving scope legality to analyzer decisions. -->

# Interpreter Milestone: Conditionals

## Learning Goal

Execute exactly one branch based on a boolean condition.

## Prerequisites

- [Interpreter expressions](interpreter-expressions.md) milestone.
- [Interpreter variables and assignments](interpreter-variables-assignments.md) milestone.
- [Parser `if` statements](parser-if-statements.md) milestone.
- [Runtime error model](runtime-value-environment-errors.md) for invalid condition diagnostics.

## Concepts to Understand

- A condition must evaluate before any branch body executes.
- Only the selected branch may produce side effects.
- `else if` can be represented as an `else` branch containing another `IfStmt`.
- Semantic analyzer lessons decide static legality; this interpreter lesson only guards dynamic condition values.

## Relevant Specification Links

- `../Language specification.md#control-flow`
- `../Language specification.md#operators`
- `../Language specification.md#scoping-rules`
- `../Language specification.md#grammar-ebnf`

## Existing Code Context

- `parser-if-statements.md` defines condition parsing and branch AST shape.
- Expression evaluation already provides boolean results and runtime errors.
- Statement execution infrastructure should be able to execute a list of statements in the current environment.

## Included

- Evaluate an `if` condition.
- Execute the then branch when the condition is `true`.
- Execute the else branch when the condition is `false` and an else branch exists.
- Treat absent else branch as no-op when the condition is `false`.
- Runtime guard for non-boolean conditions.

## Non-Goals

- Adding a new if-block scope unless the semantic model later requires it.
- Static type checking of conditions.
- Parser changes for `else if`.
- Loop, function, or return propagation beyond preserving existing statement completion behavior.

## Grammar and AST Shape

The current parser shape is:

```txt
IfStmt
  condition
  thenBranch
  elseBranch?
```

`else if` is represented as a nested `IfStmt` in the optional `elseBranch`, not as a separate AST node.

## Branch Execution Semantics

- Evaluate the condition first.
- If the result is `true`, execute only `thenBranch`.
- If the result is `false`, execute only `elseBranch` when present.
- If the result is not boolean, report a runtime condition error.
- Preserve any completion signal from the executed branch for later return propagation lessons.

## Side-Effect Expectations

Skipped branches must not evaluate expressions or execute statements. Tests should include branch bodies that would mutate variables or throw if accidentally executed.

## TDD-Oriented Student Checklist

- A true condition executes the then branch only.
- A false condition with no else branch is a no-op.
- A false condition with an else branch executes the else branch only.
- A skipped branch has no side effects.
- A non-boolean condition reports a runtime guard error.
- Nested `else if` behavior follows nested `IfStmt` execution.

## Verification

- Use variables as observable side effects for selected and skipped branches.
- Include one nested `else if` program to prove no special AST handling is needed.
- Confirm no test depends on an invented if-local scope.

## Gates and Open Questions

- The spec has global, function, and loop scopes only; do not invent if-block scope in this milestone.
- If the analyzer later guarantees boolean conditions, keep the runtime guard as a defensive dynamic check unless the project explicitly removes it.

## Notes

This milestone is about control-flow selection, not name-binding design. Let the current environment model determine where branch statements read and write.
