<!-- ABOUTME: Defines the semantic return and function-kind lesson. -->
<!-- ABOUTME: Teaches explicit returns, void/value function kinds, and invalid call contexts. -->

# Semantic Milestone: Returns and Function Kind

## Learning Goal

Check return placement, required returns, void/value function kind, mixed returns, and invalid use of void calls in expression contexts.

## Prerequisites

Complete or review:

- [Functions, calls, and arity](semantic-functions-calls-arity.md)
- [Function parsing](parser-functions.md)

## Concepts to Understand

- A `return` statement only makes sense inside a function body unless a parser rule rejects it earlier.
- `return;` communicates a void function; `return expression;` communicates a value-returning function.
- A function's return kind can be inferred from its return statements for this simple language.
- Baseline analysis requires at least one explicit `return` statement in every function.
- Expression contexts need values, so void calls should not be used as initializer values or subexpressions.
- Statement contexts can allow void calls when the call is used only for its effect.

## Relevant Specification Links

- [User-Defined Functions](<../Language specification rev 2.md#user-defined-functions>)
- [Semantic Analyzer component](<../Language specification rev 2.md#3-semantic-analyzer-analyzerts>)
- [Grammar (EBNF)](<../Language specification rev 2.md#grammar-ebnf>)

## Grammar and AST Shape

There is no grammar change. This lesson uses `ReturnStmt.value?`; with `exactOptionalPropertyTypes`, the optional property should be absent when no return value exists.

## TDD-Oriented Student Checklist

- Accept a function that explicitly returns no value with `return;`.
- Accept a function that returns a value with `return expression;`.
- Report every function that contains no explicit `return` statement.
- Report mixed return kinds within one function.
- Report `return` outside a function if the parser has not already rejected it.
- Report a void call used in an initializer or larger expression.
- Accept a value-returning call in an expression when the function is known.
- Accept a void call as a standalone statement.

## Non-Goals

- No runtime return propagation.
- No static value type inference beyond void versus value.
- No path-sensitive all-branches checking unless the decision gate chooses it.
- No built-in implementation.

## Verification

Use analyzer tests for each checklist behavior. Run `pnpm test` and `pnpm typecheck` after implementation changes.

## Decision Gates

- Decide whether to add optional path-sensitive all-branches checking after the baseline explicit-return check.
- Decide whether top-level `return` is rejected by the parser or diagnosed by the analyzer.
