<!-- ABOUTME: Defines interpreter behavior for GIC variable declarations and assignment statements. -->
<!-- ABOUTME: Connects statement execution to the shared environment model without adding analyzer checks. -->

# Interpreter Milestone: Variables and Assignments

## Learning Goal

Execute declaration and assignment statements using the runtime environment model.

## Prerequisites

- [Runtime value, environment, and error model](runtime-value-environment-errors.md) milestone.
- [Interpreter expressions](interpreter-expressions.md) milestone.
- [Parser assignment](parser-assignment.md) milestone for variable declarations and assignment statements.

## Concepts to Understand

- Statements are executed for effects, not just values.
- A declaration creates a binding in the current environment.
- Assignment mutates an existing binding and does not create a new one.
- Redeclaration, shadowing, and reserved-name policy belong to semantic analysis and built-in lessons.

## Relevant Specification Links

- `../Language specification rev 2.1.md#variables`
- `../Language specification rev 2.1.md#scoping-rules`
- `../Language specification rev 2.1.md#grammar-ebnf`
- `../Language specification rev 2.1.md#error-message-guidelines`

## Existing Code Context

- Parser assignment documents describe declaration and assignment AST nodes.
- The expression interpreter should already be able to evaluate initializer and right-hand-side expressions.
- The environment model defines how names are declared, looked up, and assigned.

## Included

- Execute variable declarations with initializers.
- Store declared names in the current environment.
- Execute assignment statements by evaluating the right-hand side once.
- Update the nearest owning environment for the assigned name.
- Report undeclared assignment errors when the analyzer did not catch them.

## Non-Goals

- Treating assignment as an expression.
- Static declared-before-use checks.
- Redeclaration and shadowing errors.
- Reserved built-in names and read-only constants.
- If, repeat, function, setup, or loop scoping decisions beyond using the current environment.

## Runtime/Backend Boundary Shape

Statement execution mutates the current environment but does not produce a user-visible value. Assignment is a statement in GIC, not an expression result that can be nested inside another expression.

Conceptual execution shape:

```txt
execute(statement, environment)
  mutates environment
  returns completion status
```

Completion status may later carry return propagation, but this milestone can use a simple normal-completion path.

## Declaration Semantics

- Evaluate the initializer before creating or finalizing the binding.
- Store the resulting GIC value under the declared name in the current environment.
- If analyzer enforcement is incomplete, decide whether redeclaration produces a runtime error or remains unchecked only in tests for the analyzer.

## Assignment Semantics

- Evaluate the assigned expression exactly once.
- Search from the current environment outward for the nearest existing owner.
- Update that owner with the new value.
- If no owner exists, report an unknown write error with the assignment token.

## Interaction with Scopes

This lesson should use whatever current environment it is handed. It should not invent new if-block scope or loop scope rules; those belong to control-flow milestones and semantic decisions.

## TDD-Oriented Student Checklist

- A declaration initializer is evaluated once.
- Later identifier reads can observe the declared value.
- Assignment updates an existing binding.
- Assignment to a global from a child environment updates the global owner.
- Assignment to an undeclared name reports a runtime error.
- Redeclaration and shadowing remain analyzer concerns, not hidden interpreter policy.

## Verification

- Use expression stubs or small programs to count initializer evaluation.
- Test environment state after declarations and assignments.
- Include one child-environment assignment test to confirm nearest-owner behavior.
- Check unknown-write diagnostics include token evidence.

## Gates and Open Questions

- If/repeat body declaration visibility follows the semantic scoping decision.
- Reserved names belong to built-in and analyzer lessons.
- Runtime redeclaration behavior should not mask missing analyzer tests.

## Notes

Keep this milestone boring on purpose. Correct environment mutation is the foundation for conditionals, loops, functions, setup, and animation frames.
