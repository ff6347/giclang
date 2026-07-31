<!-- ABOUTME: Describes interpreter support for user-defined GIC functions and return statements. -->
<!-- ABOUTME: Covers call environments, argument binding, return propagation, and non-callable guards. -->

# Interpreter Milestone: User-Defined Functions and Returns

## Learning Goal

Call user functions with local environments and return propagation.

## Prerequisites

- [Parser functions and returns](parser-functions.md), and [call expressions](parser-call-expressions.md) milestones.
- [Runtime value, environment, and error model](runtime-value-environment-errors.md) milestone.
- [Interpreter expressions](interpreter-expressions.md), [variables and assignments](interpreter-variables-assignments.md), [conditionals](interpreter-conditionals.md), and [repeat statements](interpreter-repeat-statements.md).

## Concepts to Understand

- A function declaration creates a callable value without running the body.
- A call evaluates the callee and arguments before executing the function body.
- Parameters and locals live in the call environment.
- `return` must escape nested statement execution until the call boundary handles it.
- Analyzer lessons decide return-kind consistency and declared-before-use legality.

## Relevant Specification Links

- `../Language specification rev 2.md#functions`
- `../Language specification rev 2.md#scoping-rules`
- `../Language specification rev 2.md#grammar-ebnf`
- `../Language specification rev 2.md#error-message-guidelines`

## Existing Code Context

- `parser-functions.md` defines `FuncStmt` and `ReturnStmt`.
- `parser-call-expressions.md` defines `CallExpr`.
- The environment model describes function value internals and parameter binding.

## Included

- Execute function declarations by storing callables.
- Evaluate call arguments in source order.
- Bind parameters in a fresh local environment for each call.
- Execute function bodies with local variables isolated from callers.
- Allow reads and assignments through the parent chain according to environment rules.
- Propagate `return` out of nested statement execution.
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

## Function Call Semantics

- A function declaration stores a callable under the function name and does not execute the body.
- A call evaluates the callee expression, then each argument from left to right.
- The callable checks arity before binding arguments.
- Each parameter becomes a local binding in a new call environment.
- The function body executes in that call environment.

## Return Propagation

A `return` statement should stop the current function body immediately, even when it appears inside an if or repeat body. One common teaching model is to use an internal return signal that only the call boundary converts into a result.

```txt
return expression;
  evaluates expression
  signals function exit
```

Do not let this signal become a normal GIC value.

## Scoping Rules

- Function parameters and local variables do not leak after the call.
- Globals can be read through the parent chain.
- Assignments to existing globals may mutate globals when no nearer local binding owns the name.
- No closures means a function should not secretly preserve arbitrary caller-local variables after the caller exits.

## TDD-Oriented Student Checklist

- A declaration stores a callable without executing the body.
- Arguments are evaluated in order.
- Parameters are bound locally for each call.
- Local variables do not leak after a call.
- Globals are readable and mutable through the environment chain.
- `return` exits early and skips later statements.
- Recursion works for a small terminating example.
- Calling a non-callable value reports a runtime guard error.

## Verification

- Use counters to prove declaration-time bodies do not run.
- Test argument order with expressions that append to a print sink or mutate variables.
- Include early-return cases inside conditionals or repeat bodies.
- Add one non-callable call diagnostic test.

## Gates and Open Questions

- No closures in this milestone; changing that requires a semantic and runtime design decision.
- Nested function declarations need a semantic decision before runtime behavior is finalized.
- There is no user-visible `null` for void returns.
- Function kind depends on semantic return-kind analysis.

## Notes

This milestone should make built-ins feel like another callable kind later, while keeping user-defined call behavior understandable first.
