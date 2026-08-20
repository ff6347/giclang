<!-- ABOUTME: Defines the shared runtime value vocabulary for GIC interpreter milestones. -->
<!-- ABOUTME: Covers environments, assignment ownership, callable values, and runtime error shape. -->

# Runtime Value, Environment, and Error Model

## Learning Goal

Define the runtime vocabulary used by all interpreter milestones so later lessons can share consistent value, environment, callable, and error expectations.

## Prerequisites

- [Parser expression precedence](parser-expression-precedence.md), [assignment parsing](parser-assignment.md), [function parser coverage](parser-functions.md), and [call expressions](parser-call-expressions.md).
- Basic understanding of lexical scope and chained environments.
- Familiarity with GIC's three user-visible data types.

## Concepts to Understand

- Runtime values are not the same as TypeScript implementation objects.
- Environments form a parent chain for reads and writes.
- Runtime errors should explain what failed and where the source token came from.
- Function values are callable runtime internals, not values that GIC programs can inspect.

## Relevant Specification Links

- `../Language specification rev 2.2.md#data-types`
- `../Language specification rev 2.2.md#variables`
- `../Language specification rev 2.2.md#functions`
- `../Language specification rev 2.2.md#scoping-rules`
- `../Language specification rev 2.2.md#error-message-guidelines`

## Existing Code Context

- Parser milestone documents already describe token-carrying AST nodes such as `Identifier`, `Assignment`, `FuncStmt`, and `CallExpr`.
- Later interpreter documents should import this model conceptually instead of redefining values or error formats.
- If implementation files already contain temporary value aliases, treat this lesson as the point where they are made intentional.

## Included

- User-visible runtime values: number, string, and boolean.
- Internal callable values for user functions and built-ins.
- Internal control-flow signals for return propagation.
- Environment lookup and assignment rules.
- Runtime error records that carry a message and source evidence.
- Function value shape: declaration node, parameter list, body, and callable entry point.

## Non-Goals

- Semantic legality checks such as shadowing, declared-before-use, or return-kind consistency.
- Rendering backend design.
- Built-in registry contents.
- Rich multi-token source ranges beyond the available token evidence.
- Adding `null`, `undefined`, arrays, or objects to the language.

## Runtime/Backend Boundary Shape

Allowed GIC values are only number, string, and boolean. Callable values, return signals, void sentinels, and environment objects are interpreter internals and must not become user-visible values.

A small conceptual shape is enough for discussion:

```txt
RuntimeValue = number | string | boolean
InternalValue = RuntimeValue | Callable | ReturnSignal | VoidInternal
```

Runtime errors should be ordinary interpreter results or thrown interpreter-specific errors, not raw JavaScript `TypeError` or `ReferenceError` leaks.

## Runtime Values

- Numbers follow JavaScript number storage unless a later numeric lesson narrows behavior.
- Strings are text values and should not be implicitly coerced into numbers or booleans.
- Booleans are the only valid condition values.
- A function that returns no value may use an internal void marker, but GIC code cannot assign or print that marker as `null` or `undefined`.

## Environment Lookup and Assignment

- Reads search the local environment before checking the parent.
- A child environment may read global bindings through the parent chain.
- Assignment updates the nearest environment that already owns the name.
- Unknown reads and unknown writes are runtime errors if the analyzer did not already reject them.
- New local bindings are created only by declarations, parameters, or loop-variable setup, not by assignment.

## Runtime Error Shape

A useful runtime error should include:

- a short category, such as unknown variable or invalid operand;
- a human-readable message;
- token evidence when the AST node carries a name or operator token;
- enough context for tests to assert the failure without matching an entire paragraph.

Example diagnostic shape, not an implementation requirement:

```txt
RuntimeError
  message
  token
  kind
```

## Function Value Shape

A user function value should remember the declaration it came from and the environment needed for calls. Current language gates say no closures, so the captured environment may initially be the global/function declaration environment rather than arbitrary nested local state.

Verification should stay observable: calls have isolated parameter bindings, body execution sees the intended environment, and return behavior is observed only as the call result.

## TDD-Oriented Student Checklist

- Local lookup wins before parent lookup.
- Assignment updates the nearest environment that owns the name.
- Reading an unknown name reports a runtime error with token evidence.
- Assigning an unknown name reports a runtime error with token evidence.
- A child environment can read global bindings.
- Function call setup binds parameters in a fresh call environment.

## Verification

- Unit-test the environment chain without needing a full parser.
- Use tiny AST fixtures or parsed programs to confirm token evidence reaches runtime errors.
- Confirm no test can observe callable, control, or void internals as GIC values.

## Gates and Open Questions

- Richer source spans may depend on a later diagnostic milestone.
- Function kind and void/value behavior depend on semantic return-kind analysis.
- The language has no `null` or `undefined`; do not add either as a shortcut.

## Notes

This milestone is a vocabulary lesson. Keep it small and refer back to it from expression, statement, function, built-in, and rendering milestones.
