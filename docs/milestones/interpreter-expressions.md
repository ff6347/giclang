<!-- ABOUTME: Describes the interpreter milestone for evaluating GIC expression AST nodes. -->
<!-- ABOUTME: Emphasizes explicit runtime type checks and avoidance of JavaScript coercion. -->

# Interpreter Milestone: Expressions

## Learning Goal

Evaluate expression AST nodes into GIC runtime values without relying on JavaScript coercion.

## Prerequisites

- [Parser expression precedence](parser-expression-precedence.md) milestone.
- [Runtime value, environment, and error model](runtime-value-environment-errors.md) milestone.
- Familiarity with GIC operators and the three user-visible value types.

## Concepts to Understand

- Expression evaluation is recursive: child expressions produce values before their parent operator is applied.
- Static analysis should reject many invalid programs, but the interpreter still needs guards for dynamic cases.
- Logical operators decide whether to evaluate the right-hand side.
- JavaScript truthiness, string coercion, and loose equality are not GIC semantics.

## Relevant Specification Links

- `../Language specification rev 2.1.md#data-types`
- `../Language specification rev 2.1.md#operators`
- `../Language specification rev 2.1.md#grammar-ebnf`
- `../Language specification rev 2.1.md#error-message-guidelines`

## Existing Code Context

- `parser-expression-precedence.md` defines the expected expression precedence and AST shape.
- `parser-call-expressions.md` introduces `CallExpr`; this milestone may evaluate call arguments but user-function dispatch can remain delegated to later call machinery.
- The runtime environment milestone defines identifier lookup and runtime error evidence.

## Included

- Literal, grouping, unary, binary, logical, identifier, and call expression dispatch.
- Numeric runtime checks for arithmetic and numeric comparison.
- Boolean runtime checks for logical and unary boolean operators.
- String concatenation with `+` when both operands are strings.
- Runtime operator errors with operator token evidence.

## Non-Goals

- Statement execution.
- Variable declaration or assignment semantics.
- User-defined function body execution.
- Built-in registry design.
- Semantic type inference or static type checking.

## Grammar and AST Shape

This lesson evaluates the expression nodes produced by parser milestones:

```txt
Literal | Grouping | Unary | Binary
Logical | Identifier | Call
```

`Identifier` uses the environment model for lookup. `Call` evaluates the callee and arguments, then hands dispatch to the callable mechanism available at that point in the curriculum.

## Expression Evaluation Rules

- `Literal` returns the corresponding number, string, or boolean runtime value.
- `Grouping` returns the inner expression value unchanged.
- Unary numeric operators require a number operand.
- Unary boolean operators require a boolean operand.
- Binary arithmetic requires numbers, except string `+` requires two strings.
- Comparisons require compatible numeric operands unless a later gate expands this.
- Equality compares values without JavaScript coercion.

## Runtime Operator Errors

Operator errors should identify the operator and the operand expectation. The analyzer may prevent many invalid operands, but runtime guards protect call results, future built-ins, and incomplete analyzer states.

Example assertion target:

```txt
operator: "+"
expected: numbers or strings
actual: boolean and number
```

## Short-Circuit Behavior

Logical `&&` and `||` evaluate the left expression first. The right expression is evaluated only when the left value does not already determine the result.

- `false && ...` skips the right side.
- `true || ...` skips the right side.
- Non-boolean logical operands are runtime errors unless the analyzer already rejected them.

## TDD-Oriented Student Checklist

- Literals evaluate to number, string, and boolean values.
- Grouping returns the inner value.
- Unary numeric and boolean checks reject the wrong type.
- Arithmetic operators compute numeric results without string coercion.
- `+` supports string concatenation only for two strings.
- Comparisons produce booleans.
- Equality does not use JavaScript loose equality.
- Logical operators short-circuit and skip side effects in the right operand.
- Identifier expressions read through the environment model.

## Verification

- Use small parsed expressions or direct AST fixtures.
- Add failure tests for every operator family.
- Include one short-circuit test where the skipped side would otherwise throw.
- Confirm runtime errors are interpreter errors, not raw JavaScript exceptions.

## Gates and Open Questions

- Division and modulo by zero are unspecified; document chosen behavior before implementing it.
- Cross-type equality is unspecified; keep it as an open decision unless the project decides exact semantics.

## Notes

Keep expression evaluation independent from rendering, scheduling, and source-level semantic analysis. This lesson should make later statement execution feel like sequencing expression evaluations.
