<!-- ABOUTME: Defines the semantic built-in call diagnostics lesson. -->
<!-- ABOUTME: Teaches registry-driven arity, type, constant, and inferable domain checks without runtime built-ins. -->

# Semantic Milestone: Built-In Call Errors

## Learning Goal

Use the built-in registry to report clear static diagnostics for spec-listed built-in calls and constants.

## Prerequisites

Complete or review:

- [Repeat and program loop rules](semantic-repeat-loop-rules.md)
- [Built-in signatures and reserved names](built-in-signatures-reserved-names.md)

## Concepts to Understand

- Built-in call checking should be registry-driven instead of hard-coded throughout the analyzer.
- Overload resolution chooses among accepted signatures or reports why no signature matches.
- Arity diagnostics should distinguish too few arguments from too many when possible.
- Literal type categories can catch obvious mistakes without requiring full type inference.
- Constants such as `PI` or `WIDTH` are values, not functions.
- Domain checks should be limited to cases the analyzer can infer confidently.

## Relevant Specification Links

- [Built-in Functions](<../Language specification rev 2.md#built-in-functions>)
- [Data Types](<../Language specification rev 2.md#data-types>)
- [Constants](<../Language specification rev 2.md#constants>)
- [Semantic Analyzer component](<../Language specification rev 2.md#3-semantic-analyzer-analyzerts>)
- [Error Message Guidelines](<../Language specification rev 2.md#error-message-guidelines>)
- [Memory](../MEMORY.md)

## Grammar and AST Shape

There is no grammar change. This lesson uses generic `Call` nodes. Constant reassignment checks may also touch existing `Assignment` and `Identifier` nodes.

## TDD-Oriented Student Checklist

- Accept representative valid `circle` calls and reject invalid arities.
- Accept valid `noFill` usage and reject any arguments if the registry marks it zero-arity.
- Check valid `fill` overloads and reject an invalid literal type such as a boolean fill argument.
- Report wrong arity for `pow`.
- Accept a value-returning math call in an expression.
- Report calling a constant, such as `PI()`.
- Report assigning to a constant such as `WIDTH` if that has not already been covered by earlier name rules.

## Non-Goals

- No drawing, math, random, or animation runtime behavior.
- No canvas or backend tests.
- No runtime validation of values that are not statically knowable.
- No new undecided built-ins.

## Verification

Use analyzer tests for representative valid and invalid built-ins, including diagnostic location and message assertions. Run `pnpm test` and `pnpm typecheck` after implementation changes.

## Decision Gates

- Decide the scope of static inference used for built-in argument checking.
- Decide which domain ranges are semantic errors instead of runtime errors or warnings.
- Decide whether built-in shadowing ownership remains in earlier name analysis or is revisited here.
- Decide the animation-only policy for `frameRate` and `frameCount`.
