<!-- ABOUTME: Defines the semantic variable, assignment, and shadowing lesson. -->
<!-- ABOUTME: Teaches symbol tables, declared-before-use checks, and reserved-name diagnostics. -->

# Semantic Milestone: Variables, Assignments, and Shadowing

## Learning Goal

Analyze variable declarations, identifier uses, assignments, redeclarations, and no-shadowing constraints with clear diagnostics.

## Prerequisites

Complete or review:

- [Analyzer diagnostic harness](semantic-analyzer-diagnostic-harness.md)
- [Assignment parsing](parser-assignment.md)
- [`repeat` statement parsing](parser-repeat-statements.md)
- [Function parsing](parser-functions.md)

## Concepts to Understand

- Symbol tables record names that are visible in a scope.
- Revision 2.1 uses a simple flat scope baseline: global names, function-local parameters/variables, and loop-local repeat variables.
- Top-level variables and functions share one namespace whose names are reserved program-wide.
- Functions can read and modify globals, but there are no closures over non-global enclosing scopes.
- Declared-before-use means source order matters even though global names are reserved regardless of order.
- Assignment targets must name a variable, parameter, or repeat variable; functions and built-ins are not assignable.
- Reserved names from keywords and built-ins are prohibited at every declaration site.
- No-shadowing keeps beginner programs explicit and easier to read.

## Relevant Specification Links

- [Variables](<../Language specification rev 2.1.md#variables>)
- [Scoping Rules](<../Language specification rev 2.1.md#scoping-rules>)
- [Semantic Analyzer component](<../Language specification rev 2.1.md#3-semantic-analyzer-analyzerts>)

## Grammar and AST Shape

There is no grammar change. This lesson uses existing `VarDecl`, `Assignment`, and `Identifier` nodes against the revision 2.1 flat scope model: declarations in ordinary blocks belong to the enclosing global or function scope unless they are repeat loop variables.

## TDD-Oriented Student Checklist

- Accept valid declaration, use, and assignment in source order.
- Report assignment to an undefined target.
- Report identifier use in an initializer before that identifier has been declared.
- Report same-scope variable redeclaration.
- Report reuse of any visible name.
- Report conflicts with program-wide global variable and function names regardless of declaration order.
- Report attempts to use reserved names for variables, functions, parameters, or repeat variables.
- Report assignments to functions and built-ins.
- Report at most one primary diagnostic at each source location while collecting independent diagnostics elsewhere.
- Check function-local variables do not leak into global scope.
- Check ordinary block declarations follow the revision 2.1 flat scope baseline rather than creating new block-local scopes.
- Check diagnostics point at the name being declared, assigned, or used.

## Non-Goals

- No static type checking.
- No function call arity checking.
- No return placement or return-kind checks.
- No repeat variable reassignment rule unless it is explicitly scoped into this lesson.

## Verification

Use analyzer tests for each checklist behavior, including diagnostic message and location assertions. Run `pnpm test` and `pnpm typecheck` after implementation changes.

## Decision Gates

- No open gate for ordinary block scopes: use the revision 2.1 flat scope baseline.
- Reserved-name diagnostics are part of this lesson and apply at every declaration site.
- Global names are reserved program-wide, so analysis must distinguish global name reservation from source-order visibility.
- A source location receives at most one primary diagnostic.
