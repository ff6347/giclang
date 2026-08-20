<!-- ABOUTME: Describes interpreter support for user-defined GIC functions and return statements. -->
<!-- ABOUTME: Covers call environments, argument binding, return propagation, and non-callable guards. -->

# Interpreter Milestone: User-Defined Functions and Returns

## Learning Goal

Run user-defined functions with isolated call environments and observable `return` behavior.

## Prerequisites

- [Parser functions and returns](parser-functions.md), and [call expressions](parser-call-expressions.md) milestones.
- [Call target syntax](../decisions/call-target-syntax.md) is a blocking decision for resolving the parser/spec mismatch before this milestone proceeds.
- [Runtime value, environment, and error model](runtime-value-environment-errors.md) milestone.
- [Interpreter expressions](interpreter-expressions.md), [variables and assignments](interpreter-variables-assignments.md), [conditionals](interpreter-conditionals.md), and [repeat statements](interpreter-repeat-statements.md).

## Concepts to Understand

- A function declaration creates a callable value without running the body.
- Calls expose source-order side effects from the callee expression and arguments before body effects.
- Parameters and locals live in the call environment.
- `return` ends the current function call, even when it appears inside nested statement bodies.
- Analyzer lessons decide return-kind consistency and declared-before-use legality.

## Relevant Specification Links

- `../Language specification.md#functions`
- `../Language specification.md#scoping-rules`
- `../Language specification.md#grammar-ebnf`
- `../Language specification.md#error-message-guidelines`

## Existing Code Context

- `parser-functions.md` defines `FuncStmt` and `ReturnStmt`.
- `parser-call-expressions.md` defines `CallExpr`.
- The environment model describes function value behavior and parameter binding.

## Included

- Execute function declarations by storing callables.
- Preserve observable source-order side effects from callee and argument expressions.
- Bind parameters in a fresh local environment for each call.
- Execute function bodies with local variables isolated from callers.
- Allow reads and assignments through the parent chain according to environment rules.
- Make `return` stop the current function call and produce its optional result.
- Support recursion through ordinary name lookup.
- Runtime guard for calling non-callable values.

## Non-Goals

- Closures over arbitrary nested local environments.
- Nested function declaration legality decisions.
- Static arity, return-kind, or all-paths-return analysis.
- Built-in function registry contents.
- User-visible `null` or `undefined` for functions that do not return a value.

## Grammar and AST Shape

The relevant nodes are:

```txt
FuncStmt
ReturnStmt
CallExpr
```

`FuncStmt` contains a name, parameter tokens, and body statements. `ReturnStmt` contains an optional expression. `CallExpr` contains a callee expression and argument expressions.

## Observable Function Call Behavior

- A function declaration stores a callable under the function name and does not execute the body.
- Source-order side effects from the callee expression and arguments are observable before any function-body side effects.
- Arity errors are reported before a function body can observe partially bound parameters.
- Each call gets its own local parameter bindings.
- Local variables created during one call are not visible to later calls or to the caller.
- A function can read globals through the environment chain and may mutate an existing global when the environment rules allow it.

## Return Behavior

A `return` statement ends the current function call immediately:

- `return expression;` evaluates the expression and makes that value the call result.
- `return;` ends the call without exposing `null`, `undefined`, or another user-visible placeholder.
- Statements after a taken `return` do not execute.
- A `return` inside an `if` branch or `repeat` body still exits the surrounding function call.
- Return handling is an interpreter detail; tests should assert the visible call result and skipped side effects.

## Scoping Rules

- Function parameters and local variables do not leak after the call.
- Globals can be read through the parent chain.
- Assignments to existing globals may mutate globals when no nearer local binding owns the name.
- No closures means a function should not secretly preserve arbitrary caller-local variables after the caller exits.

## TDD-Oriented Student Checklist

- A declaration stores a callable without executing the body.
- Argument source-order side effects are observable.
- Parameters are bound locally for each call.
- Local variables do not leak after a call.
- Globals are readable and mutable through the environment chain.
- `return` exits early and skips later statements.
- `return expression;` produces the expression value as the call result.
- `return;` has no user-visible placeholder value.
- Recursion works for a small terminating example.
- Calling a non-callable value reports a runtime guard error.

## Verification

- Use counters to prove declaration-time bodies do not run.
- Test callee and argument source order with expressions that append to a print sink or mutate variables.
- Include early-return cases inside conditionals or repeat bodies.
- Add one non-callable call diagnostic test.

## Gates and Open Questions

- No closures in this milestone; changing that requires a semantic and runtime design decision.
- Nested function declarations need a semantic decision before runtime behavior is finalized.
- There is no user-visible `null` for void returns.
- Function kind depends on semantic return-kind analysis.

## Notes

This milestone should make built-ins feel like another callable kind later, while keeping user-defined call behavior understandable first.
