<!-- ABOUTME: Defines the semantic function declaration, call, and arity lesson. -->
<!-- ABOUTME: Teaches function symbols, declaration order, parameters, recursion, and call diagnostics. -->

# Semantic Milestone: Functions, Calls, and Arity

## Learning Goal

Analyze user-defined function declarations, parameter symbols, call resolution, declaration order, and arity.

## Prerequisites

Complete or review:

- [Variables, assignments, and shadowing](semantic-variables-assignments-shadowing.md)
- [Function parsing](parser-functions.md)
- [Call-expression parsing](parser-call-expressions.md)
- [Call target syntax](../decisions/call-target-syntax.md) is a blocking decision for resolving the parser/spec mismatch before this milestone proceeds.

## Concepts to Understand

- Function names follow variable naming rules and cannot shadow global variables, other functions, reserved words, or built-in names.
- No hoisting means ordinary calls must respect declaration order, while recursive self-calls are allowed by the specification.
- Parameters are symbols scoped to a function body.
- Duplicate parameters make call behavior unclear and should be diagnosed.
- User-defined calls and built-in calls can share resolution machinery while still having different metadata sources.
- The call-target syntax is intentionally unresolved here: the parser milestone currently models a generic callee expression, while the rev-2 grammar models calls as `IDENTIFIER(...)`.

## Relevant Specification Links

- [User-Defined Functions](<../Language specification rev 2.2.md#user-defined-functions>)
- [Scoping Rules](<../Language specification rev 2.2.md#scoping-rules>)
- [Grammar (EBNF)](<../Language specification rev 2.2.md#grammar-ebnf>)
- [Semantic Analyzer component](<../Language specification rev 2.2.md#3-semantic-analyzer-analyzerts>)

## Grammar and AST Shape

No parser change is planned in this milestone. This lesson uses `FuncStmt` and `Call`, but the exact allowed call target shape is blocked on the [call target syntax decision](../decisions/call-target-syntax.md) because the current parser may permit generic callee expressions while the specification call grammar uses `IDENTIFIER` for calls.

## TDD-Oriented Student Checklist

- Align call-target tests with the [call target syntax decision](../decisions/call-target-syntax.md) before adding analyzer cases that depend on target shape.
- Accept a call to a user function declared earlier.
- Report a call before declaration when no-hoisting applies.
- Report a call to an undefined function.
- Report the wrong number of arguments.
- Report duplicate function names.
- Report a function/global variable name collision per the spec no-shadowing rule.
- Report duplicate parameter names.
- Accept a recursive self-call inside the function currently being analyzed.

## Non-Goals

- No function execution.
- No return-kind checking.
- No built-in arity checking unless the deferral gate says to include it here.
- No overloads for user-defined functions.

## Verification

After the [call target syntax decision](../decisions/call-target-syntax.md) is resolved, use analyzer tests for a valid call, undefined call, before-declaration call, arity mismatch, and duplicate names. Do not lock in tests that choose a call-target implementation before that decision. Run `pnpm test` and `pnpm typecheck` after implementation changes.

## Decision Gates

- Blocking: resolve the [call target syntax decision](../decisions/call-target-syntax.md) before implementing call-target-dependent diagnostics.
- Decide whether nested function declarations are valid and how their symbols are scoped.
- Decide whether built-in arity checks are deferred to the built-in call error lesson.
