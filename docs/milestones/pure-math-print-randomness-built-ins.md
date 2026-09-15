<!-- ABOUTME: Plans the pure built-in runtime milestone for constants, math, print, and randomness. -->
<!-- ABOUTME: Keeps non-rendering built-ins deterministic and routed through callable dispatch. -->

# Built-in Runtime Milestone: Pure Functions, Constants, Print, and Randomness

## Learning Goal

Add deterministic non-rendering built-ins through the same call-dispatch seam as user functions.

## Prerequisites

- [Runtime value, environment, and error model](runtime-value-environment-errors.md) milestone.
- [Interpreter functions and returns](interpreter-functions-returns.md) milestone.
- [Interpreter expressions](interpreter-expressions.md) for call evaluation and runtime operator guards.
- A test output sink for print behavior.

## Concepts to Understand

- Built-ins are callable runtime internals, not syntax exceptions.
- Constants are read-only bindings exposed through the environment or registry.
- Deterministic tests need controlled output and the public `randomSeed(n)` built-in specified by `../Language specification.md`.
- Domain, arity, and type errors are runtime guard responsibilities unless analyzer support exists.

## Relevant Specification Links

- `../Language specification.md#built-in-functions`
- `../Language specification.md#console-output`
- `../Language specification.md#math-functions`
- `../Language specification.md#constants`
- `../Language specification.md#animation-built-ins`

## Existing Code Context

- User-defined functions should already use a callable dispatch seam.
- The environment model distinguishes user-visible values from internal callable values.
- Variable assignment semantics should be able to reject writes to read-only bindings once constants exist.

## Included

- Built-in registry for pure callable functions.
- Constants `PI`, `WIDTH`, and `HEIGHT`.
- Read-only behavior for constants.
- Deterministic print capture through an injectable output sink.
- Math functions listed by the language specification.
- Degree-based trigonometry.
- Public `randomSeed(n)` support for seeded randomness in programs and tests.
- Runtime guards for arity, type, and domain errors.

## Non-Goals

- Drawing built-ins such as `circle`, `line`, or `background`.
- Animation state such as `frameCount` timing.
- Browser console or DOM output.
- Static analyzer implementation for built-in names.
- Choosing all numeric edge-case behavior silently.

## Runtime/Backend Boundary Shape

The built-in registry should provide callable entries and constant bindings through the same mechanisms user code already uses:

```txt
builtins
  constants
  pureFunctions
  outputSink
```

The print sink and random source should be injectable so tests do not depend on global console or ambient randomness.

## Constants and Read-Only Names

- `PI` is numeric.
- `WIDTH` and `HEIGHT` reflect the fixed logical canvas size.
- Constants can be read like ordinary names.
- Assignment to constants should fail clearly, either through analyzer checks, runtime read-only guards, or both.

## Math and Random Functions

Math built-ins should accept and return GIC numbers. Trigonometric functions use degrees, matching the learner-facing language design rather than JavaScript's radian defaults.

`../Language specification.md` exposes `randomSeed(n)` as a public GIC built-in. Use that public API to seed random behavior in programs and tests; the interpreter may still inject the underlying random source behind the built-in for determinism.

## Print Output Sink

`print` should convert allowed GIC values into deterministic captured output. It should not expose internal callable, return, or void values.

## TDD-Oriented Student Checklist

- `PI`, `WIDTH`, and `HEIGHT` are available as constants.
- Constants are read-only.
- `print` output is captured deterministically in tests.
- Listed math functions are callable.
- Trigonometric functions use degrees.
- `randomSeed(n)` seeds random behavior deterministically through the public API.
- Arity errors report the expected and actual counts.
- Type and domain errors report useful runtime diagnostics.

## Verification

- Test each built-in through normal `CallExpr` evaluation, not a special test-only path.
- Assert print sink contents rather than console output.
- Use known angle values for degree-based trig.
- Call public `randomSeed(n)` in seeded random tests and run them more than once to prove determinism.

## Decisions

- Seeded randomness uses p5.js's 32-bit linear congruential generator with unsigned 32-bit seed coercion and state isolated to one interpreter run.
- `sqrt` rejects negative inputs. `pow` rejects only results that are `NaN` or infinite; finite negative-base and negative-exponent results remain valid.
- `frameCount` timing remains deferred to animation built-ins.
- Reserved-name analysis rejects writes to constants before interpretation.

## Notes

Keep this milestone pure and non-rendering. Drawing built-ins should wait until a backend command boundary exists.
