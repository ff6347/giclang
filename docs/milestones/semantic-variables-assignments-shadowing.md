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
- Rev-2 uses a simple flat scope baseline: global names, function-local parameters/variables, and loop-local repeat variables.
- Functions can read and modify globals, but there are no closures over non-global enclosing scopes.
- Declared-before-use means source order matters.
- Assignment targets must name an existing assignable symbol.
- Reserved names from keywords and built-ins should not be available for student declarations.
- No-shadowing keeps beginner programs explicit and easier to read.

## Relevant Specification Links

- [Variables](<../Language specification rev 2.1.md#variables>)
- [Scoping Rules](<../Language specification rev 2.1.md#scoping-rules>)
- [Semantic Analyzer component](<../Language specification rev 2.1.md#3-semantic-analyzer-analyzerts>)

## Grammar and AST Shape

There is no grammar change. This lesson uses existing `VarDecl`, `Assignment`, and `Identifier` nodes against the rev-2 flat scope model: declarations in ordinary blocks belong to the enclosing global or function scope unless they are repeat loop variables.

## TDD-Oriented Student Checklist

- Accept valid declaration, use, and assignment in source order.
- Report assignment to an undefined target.
- Report identifier use in an initializer before that identifier has been declared.
- Report same-scope variable redeclaration.
- Report shadowing of a global by a parameter, local variable, or function name.
- Report attempts to declare reserved names.
- Check function-local variables do not leak into global scope.
- Check ordinary block declarations follow the rev-2 flat scope baseline rather than creating new block-local scopes.
- Check diagnostics point at the name being declared, assigned, or used.

## Non-Goals

- No static type checking.
- No function call arity checking.
- No return placement or return-kind checks.
- No repeat variable reassignment rule unless it is explicitly scoped into this lesson.

## Verification

Use analyzer tests for each checklist behavior, including diagnostic message and location assertions. Run `pnpm test` and `pnpm typecheck` after implementation changes.

## Decision Gates

- No open gate for ordinary block scopes: use the rev-2 flat scope baseline unless the language specification changes.
- Decide whether reserved-name diagnostics are introduced here or fully covered by the built-in registry lesson.
