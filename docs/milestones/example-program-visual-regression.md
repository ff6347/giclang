<!-- ABOUTME: Explains deterministic example-program and visual-regression verification for GIC. -->
<!-- ABOUTME: Defines fixture scope, determinism rules, non-goals, and verification checks. -->

# Milestone: Example Program and Visual Regression Verification

## Learning Goal

Curate deterministic `.gic` examples as executable documentation and visual regression fixtures so students can see intended behavior and detect rendering regressions.

## Prerequisites

- CLI [`check` and `run` entry points](cli-check-run-entry-points.md) are available.
- The recording backend can capture drawing operations deterministically.
- Drawing, style, and canvas built-ins work through the recording backend.
- Pure math and randomness built-ins have defined behavior and test hooks.
- The browser Canvas static backend can render the same static fixture repeatedly.
- Animation scheduler and Canvas animation backend exist before adding animated fixtures.

## Concepts to Understand

- Example programs are part of the learning surface and should stay small.
- Visual regression tests compare behavior, not personal artistic taste.
- Deterministic seeding is required before random examples can become tests.
- Static fixtures should become reliable before animated frame fixtures are introduced.
- An update policy protects students from treating changed snapshots as automatically correct.

## Relevant Specification Links

- [Example Programs](<../Language specification rev 2.md#example-programs>)
- [Visual Regression Tests](<../Language specification rev 2.md#visual-regression-tests>)
- [Integration Tests](<../Language specification rev 2.md#integration-tests>)
- [Canvas](<../Language specification rev 2.md#canvas>)
- [Shape Drawing](<../Language specification rev 2.md#shape-drawing>)
- [Math Functions](<../Language specification rev 2.md#math-functions>)
- [Animation](<../Language specification rev 2.md#animation>)
- [Animation Built-ins](<../Language specification rev 2.md#animation-built-ins>)
- [Testing Strategy](<../Language specification rev 2.md#testing-strategy>)

## Included

- A small set of deterministic `.gic` examples that double as documentation.
- Expected command outcomes for each fixture.
- Expected recording or image artifacts for selected render fixtures.
- Deterministic seeding rules for examples that use randomness.
- A tolerance and snapshot update policy for visual comparison.
- A static-versus-animated frame policy that keeps animated coverage intentionally narrow.

## Grammar and AST Shape / Interface Boundary

No grammar or AST changes belong in this milestone.

The interface boundary is fixture-oriented: each example states what command behavior and visual artifact are expected, how randomness is seeded, and how comparisons are judged. Static examples should define one stable result; animated examples should define selected frames only after the static pipeline is trustworthy.

## TDD-oriented Student Checklist

- Add a minimal static example that passes the future `gic check` path.
- Add an end-to-end render or record test for that static example.
- Add a seeded random example only when the seed is explicit in the fixture policy.
- Add a visual comparison tolerance test before relying on image snapshots.
- Add a negative broken-example check to prove invalid examples fail clearly.
- Add an animated fixture only after static output is repeatable and documented.

## Non-Goals

- New drawing APIs.
- Transforms, lists, imports, or `dist()`.
- Server PNG or GIF export unless a later decision selects that path.
- Expanding math built-ins beyond the already selected curriculum surface.
- A large gallery of finished artworks.

## Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm fmt:check`
- `pnpm lint`
- All curated examples pass the future `gic check` command.
- Repeated static output matches within the documented comparison rules.
- Random examples use an explicit seed.
- Animated fixtures document which frames are compared and why.

## Notes / Decision Gates

Optional export or server rendering remains deferred until a separate decision selects it. Built-in math expansion also remains deferred; do not add new math functions simply because an example would be convenient with them.
