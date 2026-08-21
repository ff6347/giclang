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
- [Call target syntax](../decisions/call-target-syntax.md) selects bare identifier targets; complete its parser and AST alignment checklist before this milestone proceeds.

## Concepts to Understand

- Function names follow variable naming rules and cannot shadow global variables, other functions, reserved words, or built-in names.
- No hoisting means ordinary calls must respect declaration order, while recursive self-calls are allowed by the specification.
- Parameters are symbols scoped to a function body.
- Duplicate parameters make call behavior unclear and should be diagnosed.
- User-defined calls and built-in calls can share resolution machinery while still having different metadata sources.
- Call targets are bare identifiers. The analyzer resolves that identifier and distinguishes user functions, built-ins, variables/constants, and missing names.

## Relevant Specification Links

- [User-Defined Functions](<../Language specification.md#user-defined-functions>)
- [Scoping Rules](<../Language specification.md#scoping-rules>)
- [Grammar (EBNF)](<../Language specification.md#grammar-ebnf>)
- [Semantic Analyzer component](<../Language specification.md#3-semantic-analyzer-analyzerts>)

## Grammar and AST Shape

No parser change belongs in this milestone. Complete the parser/AST alignment from the [call target syntax decision](../decisions/call-target-syntax.md) first. This lesson then uses `FuncStmt` and identifier-target `Call` nodes.

## TDD-Oriented Student Checklist

- Confirm parser and AST tests enforce the identifier-only [call target syntax decision](../decisions/call-target-syntax.md) before adding analyzer cases.
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

Use analyzer tests for a valid identifier call, undefined call, before-declaration call, non-callable identifier, arity mismatch, and duplicate names. Run `pnpm test` and `pnpm typecheck` after implementation changes.

## Decision Gates

- Complete the parser and AST alignment checklist in the [call target syntax decision](../decisions/call-target-syntax.md) before implementing call diagnostics.
- No open gate for nested declarations: functions remain global-only under revision 2.2.
- Decide whether built-in arity checks are deferred to the built-in call error lesson.
