<!-- ABOUTME: Records the identifier-only call-target syntax decision for GIC. -->
<!-- ABOUTME: Defines parser, AST, analyzer, and runtime consequences for function calls. -->

# Call Target Syntax

Status: Decided

## Decision

GIC call targets are bare identifiers. Built-in and user-defined functions use the same syntax:

```gic
circle(50, 50, 20);
let result = calculate(2);
```

A call target is not an arbitrary expression. Parenthesized identifiers, literals, grouped expressions, and call results cannot be called:

```gic
(circle)(50, 50, 20);
42();
(1 + 2)(3);
makeThing()(1);
```

The parser reports `Only function names can be called.` at the opening `(` of an attempted non-identifier call.

## Grammar and AST Boundary

The grammar remains:

```ebnf
callExpr = IDENTIFIER "(" arguments? ")" | primary ;
```

`CallExpr.callee` is an `IdentifierExpr`, not a general `Expression`. Arguments remain full expressions, and calls may appear inside larger expressions.

The parser validates only the target's syntactic shape. An identifier call such as `item()` parses successfully; semantic analysis determines whether `item` denotes a user function, built-in function, variable, constant, or missing name.

## Rationale

- GIC has named user functions and built-in functions, but no user-visible function values.
- GIC does not define anonymous functions, methods, properties, modules, or another expression form that can evaluate to a callable value.
- Generic callee expressions would admit syntax such as `42()` without defining a valid program that could make the literal callable.
- Parser rejection gives beginners a direct syntax diagnostic instead of accepting an expression that the analyzer or runtime must later reject.
- Narrowing the AST makes the selected language invariant explicit to the parser, analyzer, interpreter, and TypeScript compiler.
- Future method, qualified-name, or first-class-function syntax requires a deliberate language decision rather than inheriting accidental parser support.

## Consequences

- The parser accepts one argument list after a bare identifier and rejects grouped, literal, binary, and chained-call targets.
- User-defined and built-in call resolution share the same identifier-target AST shape.
- Analyzer call rules resolve the callee name, then distinguish missing names, variables/constants, user functions, and built-in functions.
- The interpreter resolves an internal callable by name. Callable runtime objects may remain implementation details but are not GIC expression values.
- Argument expressions retain ordinary source-order evaluation. There is no separate callee-expression evaluation step.

## Alternatives Not Selected

- **Parser-generic, analyzer-restricted calls:** rejected because it preserves AST shapes that no valid GIC runtime value can satisfy.
- **Deliberate generic calls:** rejected because it would require first-class function values and a broader runtime/type design that GIC does not need.
- **Generic syntax reserved in the current parser:** rejected because accidental acceptance is not a stable reservation mechanism. Future syntax can be added explicitly when its semantics are designed.

## Alignment Checklist

- [x] Confirm the active grammar uses identifier call targets.
- [x] Define the parser diagnostic and source location for non-identifier calls.
- [x] Narrow `CallExpr.callee` to `IdentifierExpr`.
- [x] Align parser tests and implementation with the selected syntax boundary.
- [x] Confirm analyzer diagnostics distinguish callable and non-callable names.
- [ ] Confirm interpreter dispatch resolves internal callables by identifier.

## Unblocks

- [Analyze function declarations, calls, and arity](../milestones/semantic-functions-calls-arity.md)
- [Analyze inferable type, semantic, and domain errors for built-in calls](../milestones/semantic-built-in-call-errors.md)
- [Interpret user-defined functions and returns](../milestones/interpreter-functions-returns.md)

## Non-Goals

- Selecting method, property, module, or qualified-name syntax.
- Adding first-class or anonymous functions.
- Changing function declaration syntax.
- Implementing analyzer or runtime call behavior in this decision.
