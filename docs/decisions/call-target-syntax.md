<!-- ABOUTME: Frames the unresolved GIC call-target syntax decision. -->
<!-- ABOUTME: Records the parser/spec mismatch without choosing an implementation path. -->

# Decide Call Target Syntax

Status: Unresolved

## Decision Question

Should GIC calls be limited to `IDENTIFIER(...)`, or should the language accept a more general callee expression shape?

## Current Baseline

The rev-2 grammar describes calls as `IDENTIFIER "(" arguments? ")"` in `callExpr`, while the completed parser call-expression milestone models calls as a generic `callee: Expression` and parses `primary ( "(" arguments? ")" )*`. That means the parser milestone and AST can represent call targets that the written specification does not currently allow.

## Why This Is a Gate

Function and call analysis must know which call targets are syntactically valid before it can report undefined functions, declaration-order errors, arity errors, or invalid target diagnostics. Choosing the boundary later may force parser tests, AST helpers, analyzer assumptions, and examples to change.

## Options and Consequences

- **Spec-strict identifier calls**
  - Keeps calls aligned with the rev-2 grammar and beginner-visible function names.
  - Requires the parser/AST/tests to reject or avoid generic callee expressions.
- **Parser-generic, analyzer-restricted calls**
  - Keeps the current parser shape but treats non-identifier callees as semantic errors.
  - Requires clear diagnostics explaining why a parsed expression is not callable.
- **Deliberate generic calls**
  - Makes the parser milestone shape part of the language design.
  - Requires the spec, analyzer, runtime callable model, and teaching material to define which expression values can be called.
- **Identifier calls with future syntax reserved**
  - Keeps today's valid calls identifier-only while documenting reserved space for later member calls or other forms.
  - Requires tests to distinguish intentionally reserved syntax from accidental support.

## Questions Before Choosing

- Should users ever see function values as ordinary GIC values?
- Is method-like or property-like syntax a likely future need?
- Which option produces the clearest error for beginners who type `(foo)(1)` or `makeThing()(1)`?
- How much parser churn is acceptable after the existing call-expression milestone?
- Should built-in calls and user-defined calls share exactly the same target syntax?

## Decision Checklist

- Update or confirm the grammar rule for calls.
- Update or confirm the AST shape for call targets.
- Align parser tests with the chosen syntax boundary.
- Define analyzer diagnostics for invalid, undefined, or before-declaration call targets.
- Confirm built-in and user-defined call resolution use the same selected boundary.
- Update examples if any previously accepted syntax becomes invalid.

## Unblocks

- [Analyze function declarations, calls, and arity](../milestones/semantic-functions-calls-arity.md)
- [Analyze inferable type, semantic, and domain errors for built-in calls](../milestones/semantic-built-in-call-errors.md)
- [Interpret user-defined functions and returns](../milestones/interpreter-functions-returns.md)

## Related Guidance

- [User-Defined Functions](<../Language specification.md#user-defined-functions>)
- [Grammar (EBNF)](<../Language specification.md#grammar-ebnf>)
- [Semantic Analyzer component](<../Language specification.md#3-semantic-analyzer-analyzerts>)
- [Parser call expressions](../milestones/parser-call-expressions.md)
- [Semantic functions, calls, and arity](../milestones/semantic-functions-calls-arity.md)

## Non-Goals

- Selecting a method, property, or module syntax.
- Adding first-class functions.
- Changing function declaration syntax.
- Implementing analyzer or runtime behavior in this document.
